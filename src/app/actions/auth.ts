'use server';

import { randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { hash, verify } from '@node-rs/argon2';
import { getDb } from '@/db/client';
import { users, consents, auditLogs } from '@/db/schema';
import { validatePassword, shouldLock, lockedUntil, MAX_FAILED_ATTEMPTS } from '@/domain/password';
import { CONSENT_CATALOG, pendingRequired } from '@/domain/consent';
import type { ConsentType } from '@/domain/consent';
import { startSession, endSession, getSessionUserId } from '@/lib/session';
import { getConsentRecords } from '@/lib/current-user';

/** §17.1 — "contraseñas almacenadas mediante algoritmos seguros". */
const ARGON2_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const normalizarCorreo = (email: string) => email.trim().toLowerCase();

export type AuthResult = { ok: true; verificationUrl?: string } | { ok: false; error: string };

/* ───────────────────────────── Registro (CA-01) ─────────────────────────── */

export async function register(email: string, password: string): Promise<AuthResult> {
  const correo = normalizarCorreo(email);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    return { ok: false, error: 'Escribe un correo electrónico válido.' };
  }

  const politica = validatePassword(password, correo);
  if (!politica.ok) return { ok: false, error: politica.error };

  const db = await getDb();

  // RF-01: "el correo debe ser único".
  const existe = await db.select().from(users).where(eq(users.email, correo)).limit(1);
  if (existe.length > 0) {
    return { ok: false, error: 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.' };
  }

  const token = randomBytes(32).toString('base64url');

  const [creado] = await db
    .insert(users)
    .values({
      email: correo,
      passwordHash: await hash(password, ARGON2_OPTS),
      status: 'pending_verification', // CA-01
      emailVerificationToken: token,
      emailVerificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: creado.id,
    action: 'account_created',
    entityType: 'users',
    entityId: creado.id,
  });

  await startSession(creado.id);

  /**
   * CA-01 pide enviar la confirmación por correo. El servicio de correo es
   * una dependencia externa (§27) que todavía no está contratada, así que en
   * desarrollo devolvemos el enlace para poder completar el flujo. En
   * producción NO se devuelve: se enviaría por correo.
   */
  const verificationUrl = `/verificar?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[dev] Enlace de verificación para ${correo}: ${verificationUrl}`);
    return { ok: true, verificationUrl };
  }
  return { ok: true };
}

export async function verifyEmail(token: string): Promise<AuthResult> {
  const db = await getDb();

  const encontrado = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (encontrado.length === 0) {
    return { ok: false, error: 'Ese enlace de confirmación no es válido.' };
  }

  const usuario = encontrado[0];
  if (usuario.emailVerificationExpiresAt && usuario.emailVerificationExpiresAt < new Date()) {
    return { ok: false, error: 'Ese enlace de confirmación ya venció. Solicita uno nuevo.' };
  }

  await db
    .update(users)
    .set({
      status: 'active',
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    })
    .where(eq(users.id, usuario.id));

  await db.insert(auditLogs).values({
    actorId: usuario.id,
    action: 'email_verified',
    entityType: 'users',
    entityId: usuario.id,
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}

/* ────────────────────────────── Inicio de sesión ────────────────────────── */

export async function login(email: string, password: string): Promise<AuthResult> {
  const correo = normalizarCorreo(email);
  const db = await getDb();

  const encontrado = await db.select().from(users).where(eq(users.email, correo)).limit(1);

  /**
   * Mismo mensaje para "no existe" y "contraseña incorrecta": revelar cuál
   * de los dos falló permite enumerar qué correos tienen cuenta en una
   * plataforma de salud (§17.2, minimización de exposición).
   */
  const GENERICO = 'Correo o contraseña incorrectos.';
  if (encontrado.length === 0) return { ok: false, error: GENERICO };

  const usuario = encontrado[0];

  if (usuario.status === 'suspended') {
    return { ok: false, error: 'Esta cuenta está suspendida. Comunícate con soporte.' };
  }

  // RF-01: bloqueo temporal ante intentos fallidos.
  if (usuario.lockedUntil && usuario.lockedUntil > new Date()) {
    return {
      ok: false,
      error: 'Por seguridad bloqueamos temporalmente esta cuenta. Vuelve a intentarlo en unos minutos.',
    };
  }

  const correcta = await verify(usuario.passwordHash, password).catch(() => false);

  if (!correcta) {
    const intentos = usuario.failedLoginAttempts + 1;
    await db
      .update(users)
      .set({
        failedLoginAttempts: intentos,
        lockedUntil: shouldLock(intentos) ? lockedUntil(new Date(), intentos) : null,
      })
      .where(eq(users.id, usuario.id));

    await db.insert(auditLogs).values({
      actorId: usuario.id,
      action: shouldLock(intentos) ? 'account_locked' : 'login_failed',
      entityType: 'users',
      entityId: usuario.id,
      metadata: { failedAttempts: intentos, max: MAX_FAILED_ATTEMPTS },
    });

    return { ok: false, error: GENERICO };
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, usuario.id));

  await startSession(usuario.id);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function logout(): Promise<void> {
  await endSession();
  revalidatePath('/', 'layout');
  redirect('/entrar');
}

/* ─────────────────────── Consentimientos (RF-02, CA-08) ─────────────────── */

export async function acceptConsents(aceptados: ConsentType[]): Promise<AuthResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };

  const seleccion = new Set(aceptados);

  // RF-02: los obligatorios no se pueden omitir.
  const faltantes = CONSENT_CATALOG.filter((d) => d.required && !seleccion.has(d.type));
  if (faltantes.length > 0) {
    return {
      ok: false,
      error: `Para continuar necesitas aceptar: ${faltantes.map((d) => d.titleEs).join(', ')}.`,
    };
  }

  const db = await getDb();
  const ahora = new Date();

  // Cada aceptación es una fila con su versión: el historial se conserva.
  for (const doc of CONSENT_CATALOG.filter((d) => seleccion.has(d.type))) {
    await db.insert(consents).values({
      userId,
      consentType: doc.type,
      documentVersion: doc.version,
      accepted: true,
      acceptedAt: ahora,
    });
  }

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'consent_accepted',
    entityType: 'consents',
    entityId: null,
    metadata: {
      accepted: [...seleccion],
      versions: CONSENT_CATALOG.filter((d) => seleccion.has(d.type)).map(
        (d) => `${d.type}@${d.version}`,
      ),
    },
  });

  // El acceso al dashboard depende de estos consentimientos, y la caché de
  // router del cliente guarda la redirección anterior a /onboarding. Sin esto,
  // volver a "/" reutiliza esa respuesta y el usuario queda dando vueltas.
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** CA-08 — al revocar, se registra y se detiene el uso asociado. */
export async function revokeConsent(tipo: ConsentType): Promise<AuthResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };

  const doc = CONSENT_CATALOG.find((d) => d.type === tipo);
  if (!doc) return { ok: false, error: 'Ese consentimiento no existe.' };

  const db = await getDb();

  // RB-05: no se borra la fila, se marca la revocación.
  await db
    .update(consents)
    .set({ revokedAt: new Date() })
    .where(and(eq(consents.userId, userId), eq(consents.consentType, tipo)));

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'consent_revoked',
    entityType: 'consents',
    entityId: null,
    metadata: { consentType: tipo, wasRequired: doc.required },
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function pendingConsentTypes(): Promise<ConsentType[]> {
  const userId = await getSessionUserId();
  if (!userId) return [];
  return pendingRequired(await getConsentRecords(userId)).map((d) => d.type);
}

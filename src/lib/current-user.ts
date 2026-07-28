import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getDb } from '@/db/client';
import { users, consents, profiles } from '@/db/schema';
import { getSessionUserId } from './session';
import { pendingRequired } from '@/domain/consent';
import type { ConsentRecord } from '@/domain/consent';

export async function getConsentRecords(userId: string): Promise<ConsentRecord[]> {
  const db = await getDb();
  const filas = await db.select().from(consents).where(eq(consents.userId, userId));

  return filas.map((f) => ({
    consentType: f.consentType,
    documentVersion: f.documentVersion,
    accepted: f.accepted,
    revokedAt: f.revokedAt,
  }));
}

async function tienePerfil(userId: string): Promise<boolean> {
  const db = await getDb();
  const [fila] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return Boolean(fila?.firstName && fila.birthDate);
}

/**
 * Puerta de entrada a las pantallas de paciente.
 *
 * CA-02: "cuando acepta los documentos obligatorios y completa los campos
 * requeridos, entonces puede acceder al dashboard". El orden importa — sin
 * consentimientos vigentes no se llega al producto, y si se publica una
 * versión nueva del documento el usuario vuelve a pasar por aquí.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect('/entrar');

  const db = await getDb();
  const encontrado = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  // Sesión válida pero cuenta inexistente o suspendida.
  if (encontrado.length === 0 || encontrado[0].status === 'suspended') {
    redirect('/entrar');
  }

  if (pendingRequired(await getConsentRecords(userId)).length > 0) {
    redirect('/onboarding/consentimientos');
  }

  if (!(await tienePerfil(userId))) {
    redirect('/onboarding/perfil');
  }

  return userId;
}

/** Igual que `requireUserId` pero sin exigir onboarding, para el propio onboarding. */
export async function requireUserIdRaw(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect('/entrar');
  return userId;
}

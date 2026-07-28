'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db/client';
import { profiles, clinicalProfiles, auditLogs } from '@/db/schema';
import { validateProfile } from '@/domain/profile';
import type { ProfileInput } from '@/domain/profile';
import type { GlucoseUnit } from '@/domain/glucose';
import { getSessionUserId } from '@/lib/session';
import { requireUserIdRaw } from '@/lib/current-user';

export interface SaveProfileInput {
  firstName: string;
  lastName?: string;
  birthDate: string;
  diagnosisYear?: number;
  heightCm?: number;
  glucoseUnit: GlucoseUnit;
  timezone: string;
}

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

export async function saveProfile(input: SaveProfileInput): Promise<SaveProfileResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };

  const dominio: ProfileInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
    diagnosisYear: input.diagnosisYear,
    heightCm: input.heightCm,
    glucoseUnit: input.glucoseUnit,
    timezone: input.timezone,
  };

  const validacion = validateProfile(dominio);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const db = await getDb();

  const datosPersonales = {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() || null,
    birthDate: new Date(input.birthDate),
    timezone: input.timezone,
    updatedAt: new Date(),
  };

  const datosClinicos = {
    diagnosisYear: input.diagnosisYear ?? null,
    heightCm: input.heightCm !== undefined ? String(input.heightCm) : null,
    glucoseUnit: input.glucoseUnit,
    updatedAt: new Date(),
  };

  const existePerfil = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

  if (existePerfil.length > 0) {
    await db.update(profiles).set(datosPersonales).where(eq(profiles.userId, userId));
    await db
      .update(clinicalProfiles)
      .set(datosClinicos)
      .where(eq(clinicalProfiles.userId, userId));
  } else {
    await db.insert(profiles).values({ userId, ...datosPersonales });
    await db.insert(clinicalProfiles).values({ userId, ...datosClinicos });
  }

  // RF-03: "los cambios relevantes quedarán auditados".
  await db.insert(auditLogs).values({
    actorId: userId,
    action: existePerfil.length > 0 ? 'profile_updated' : 'profile_created',
    entityType: 'profiles',
    entityId: userId,
    metadata: { glucoseUnit: input.glucoseUnit, timezone: input.timezone },
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}

export interface PerfilActual {
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  timezone: string;
  diagnosisYear: number | null;
  heightCm: number | null;
  glucoseUnit: GlucoseUnit;
}

export async function getProfile(): Promise<PerfilActual | null> {
  const userId = await requireUserIdRaw();
  const db = await getDb();

  const [personal] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const [clinico] = await db
    .select()
    .from(clinicalProfiles)
    .where(eq(clinicalProfiles.userId, userId))
    .limit(1);

  if (!personal) return null;

  return {
    firstName: personal.firstName,
    lastName: personal.lastName,
    birthDate: personal.birthDate,
    timezone: personal.timezone,
    diagnosisYear: clinico?.diagnosisYear ?? null,
    heightCm: clinico?.heightCm ? Number(clinico.heightCm) : null,
    glucoseUnit: (clinico?.glucoseUnit ?? 'mg/dL') as GlucoseUnit,
  };
}

'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, inArray, gte, lte } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  medications,
  medicationSchedules,
  medicationLogs,
  profiles,
  auditLogs,
} from '@/db/schema';
import { generateDoses, adherenceRate } from '@/domain/medication';
import type { DayKey, DoseStatus, MedicationPlan, MedicationStatus } from '@/domain/medication';
import { formatInZone, zonedTimeToUtc } from '@/domain/time-zone';
import { requireUserId } from '@/lib/current-user';

export type MedResult = { ok: true } | { ok: false; error: string };

async function zonaDelUsuario(userId: string): Promise<string> {
  const db = await getDb();
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return p?.timezone ?? 'America/Mexico_City';
}

/* ─────────────────────────── Alta de medicamento ────────────────────────── */

export interface NewMedicationInput {
  name: string;
  presentation?: string;
  /** RF-08 — "dosis informativa": texto libre del paciente. */
  doseText?: string;
  instructions?: string;
  dayPattern: (DayKey | 'daily')[];
  /** Horas civiles "HH:MM". */
  times: string[];
  startDate: string;
  endDate?: string;
}

export async function createMedication(input: NewMedicationInput): Promise<MedResult> {
  const nombre = input.name.trim();
  if (!nombre) return { ok: false, error: 'Escribe el nombre del medicamento.' };

  if (input.times.length === 0) {
    return { ok: false, error: 'Indica al menos un horario de toma.' };
  }
  if (input.times.some((t) => !/^\d{2}:\d{2}$/.test(t))) {
    return { ok: false, error: 'Revisa los horarios: deben tener el formato 08:00.' };
  }
  if (input.dayPattern.length === 0) {
    return { ok: false, error: 'Elige al menos un día de la semana.' };
  }
  if (!input.startDate) {
    return { ok: false, error: 'Indica desde cuándo lo tomas.' };
  }
  if (input.endDate && input.endDate < input.startDate) {
    return { ok: false, error: 'La fecha de finalización no puede ser anterior a la de inicio.' };
  }

  const userId = await requireUserId();
  const timezone = await zonaDelUsuario(userId);
  const db = await getDb();

  const [med] = await db
    .insert(medications)
    .values({
      userId,
      name: nombre,
      presentation: input.presentation?.trim() || null,
      doseText: input.doseText?.trim() || null,
      frequency: input.dayPattern.includes('daily') ? 'daily' : 'custom',
      instructions: input.instructions?.trim() || null,
      startDate: new Date(`${input.startDate}T00:00:00`),
      endDate: input.endDate ? new Date(`${input.endDate}T23:59:59`) : null,
      status: 'active',
    })
    .returning();

  for (const time of input.times) {
    await db.insert(medicationSchedules).values({
      medicationId: med.id,
      dayPattern: input.dayPattern,
      scheduledTime: time,
      timezone,
      active: true,
    });
  }

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'medication_created',
    entityType: 'medications',
    entityId: med.id,
    metadata: { times: input.times, dayPattern: input.dayPattern },
  });

  revalidatePath('/medicamentos');
  revalidatePath('/');
  return { ok: true };
}

/* ───────────────────────── Estado del medicamento ───────────────────────── */

/**
 * RF-08 — "pausar un recordatorio sin eliminar el medicamento". Pausar cambia
 * el estado; no borra nada ni toca el historial de tomas.
 */
export async function setMedicationStatus(
  medicationId: string,
  status: MedicationStatus,
): Promise<MedResult> {
  const userId = await requireUserId();
  const db = await getDb();

  const [med] = await db
    .select()
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.userId, userId)))
    .limit(1);

  if (!med) return { ok: false, error: 'No encontramos ese medicamento.' };

  await db.update(medications).set({ status }).where(eq(medications.id, medicationId));

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'medication_status_changed',
    entityType: 'medications',
    entityId: medicationId,
    metadata: { from: med.status, to: status },
  });

  revalidatePath('/medicamentos');
  revalidatePath('/');
  return { ok: true };
}

/* ──────────────────────────── Tomas del día ─────────────────────────────── */

export interface DoseView {
  medicationId: string;
  medicationName: string;
  doseText: string | null;
  scheduleId: string;
  scheduledAt: Date;
  status: DoseStatus;
}

async function planesDelUsuario(userId: string): Promise<
  { plan: MedicationPlan; name: string; doseText: string | null }[]
> {
  const db = await getDb();

  const meds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), isNull(medications.deletedAt)));

  if (meds.length === 0) return [];

  const horarios = await db
    .select()
    .from(medicationSchedules)
    .where(
      inArray(
        medicationSchedules.medicationId,
        meds.map((m) => m.id),
      ),
    );

  return meds.map((m) => ({
    name: m.name,
    doseText: m.doseText,
    plan: {
      medicationId: m.id,
      status: m.status,
      startDate: m.startDate ?? new Date(0),
      endDate: m.endDate,
      timezone: horarios.find((h) => h.medicationId === m.id)?.timezone ?? 'America/Mexico_City',
      schedules: horarios
        .filter((h) => h.medicationId === m.id)
        .map((h) => ({
          id: h.id,
          dayPattern: h.dayPattern as (DayKey | 'daily')[],
          time: h.scheduledTime,
          active: h.active,
        })),
    },
  }));
}

/** Tomas previstas para el día civil del usuario, con lo ya marcado. */
export async function getTodayDoses(): Promise<DoseView[]> {
  const userId = await requireUserId();
  const timezone = await zonaDelUsuario(userId);
  const db = await getDb();

  const hoy = formatInZone(new Date(), timezone);
  const desde = zonedTimeToUtc(hoy, '00:00', timezone);
  const hasta = new Date(zonedTimeToUtc({ ...hoy, day: hoy.day + 1 }, '00:00', timezone));

  const planes = await planesDelUsuario(userId);
  const previstas = planes.flatMap((p) =>
    generateDoses(p.plan, desde, hasta).map((d) => ({
      ...d,
      medicationName: p.name,
      doseText: p.doseText,
    })),
  );

  if (previstas.length === 0) return [];

  const registradas = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        inArray(
          medicationLogs.medicationId,
          previstas.map((d) => d.medicationId),
        ),
        gte(medicationLogs.scheduledAt, desde),
        lte(medicationLogs.scheduledAt, hasta),
      ),
    );

  return previstas
    .map((d) => ({
      medicationId: d.medicationId,
      medicationName: d.medicationName,
      doseText: d.doseText,
      scheduleId: d.scheduleId,
      scheduledAt: d.scheduledAt,
      // Sin marca explícita, la toma queda pendiente. RF-09: que el
      // recordatorio se haya entregado no significa que se haya tomado.
      status:
        registradas.find(
          (r) =>
            r.medicationId === d.medicationId &&
            r.scheduledAt.getTime() === d.scheduledAt.getTime(),
        )?.status ?? ('pending' as DoseStatus),
    }))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

export async function markDose(
  medicationId: string,
  scheduledAtIso: string,
  status: DoseStatus,
  omissionReason?: string,
): Promise<MedResult> {
  const userId = await requireUserId();
  const db = await getDb();

  const [med] = await db
    .select()
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.userId, userId)))
    .limit(1);

  if (!med) return { ok: false, error: 'No encontramos ese medicamento.' };

  const scheduledAt = new Date(scheduledAtIso);

  const [existente] = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        eq(medicationLogs.medicationId, medicationId),
        eq(medicationLogs.scheduledAt, scheduledAt),
      ),
    )
    .limit(1);

  const valores = {
    status,
    completedAt: status === 'completed' ? new Date() : null,
    omissionReason: omissionReason?.trim() || null,
  };

  if (existente) {
    await db.update(medicationLogs).set(valores).where(eq(medicationLogs.id, existente.id));
  } else {
    await db.insert(medicationLogs).values({ medicationId, scheduledAt, ...valores });
  }

  await db.insert(auditLogs).values({
    actorId: userId,
    action: status === 'completed' ? 'medication_marked_completed' : 'medication_marked_skipped',
    entityType: 'medication_logs',
    entityId: medicationId,
    metadata: { status, scheduledAt: scheduledAtIso },
  });

  revalidatePath('/medicamentos');
  revalidatePath('/');
  return { ok: true };
}

/* ────────────────────────────── Listado y adherencia ────────────────────── */

export interface MedicationView {
  id: string;
  name: string;
  presentation: string | null;
  doseText: string | null;
  instructions: string | null;
  status: MedicationStatus;
  times: string[];
  dayPattern: (DayKey | 'daily')[];
}

export async function listMedications(): Promise<MedicationView[]> {
  const userId = await requireUserId();
  const planes = await planesDelUsuario(userId);
  const db = await getDb();

  const meds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), isNull(medications.deletedAt)));

  return meds.map((m) => {
    const horarios = planes.find((p) => p.plan.medicationId === m.id)?.plan.schedules ?? [];
    return {
      id: m.id,
      name: m.name,
      presentation: m.presentation,
      doseText: m.doseText,
      instructions: m.instructions,
      status: m.status,
      times: horarios.map((h) => h.time).sort(),
      dayPattern: horarios[0]?.dayPattern ?? [],
    };
  });
}

/** RF-08 — adherencia autorreportada de los últimos 30 días. */
export async function getAdherence(): Promise<number | null> {
  const userId = await requireUserId();
  const db = await getDb();

  const meds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), isNull(medications.deletedAt)));

  if (meds.length === 0) return null;

  const desde = new Date(Date.now() - 30 * 86_400_000);

  const logs = await db
    .select()
    .from(medicationLogs)
    .where(
      and(
        inArray(
          medicationLogs.medicationId,
          meds.map((m) => m.id),
        ),
        gte(medicationLogs.scheduledAt, desde),
      ),
    );

  return adherenceRate(logs.map((l) => ({ status: l.status })));
}

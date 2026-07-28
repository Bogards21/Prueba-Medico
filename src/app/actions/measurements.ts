'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { weightRecords, bloodPressureRecords, auditLogs } from '@/db/schema';
import { validateWeight, toKg } from '@/domain/weight';
import type { WeightUnit } from '@/domain/weight';
import { validateBloodPressure } from '@/domain/blood-pressure';
import { evaluateRules } from '@/domain/rules/engine';
import type { RuleEvaluation } from '@/domain/rules/types';
import { getActiveApprovedRules } from '@/db/rules';
import { requireUserId } from '@/lib/current-user';

export type SaveResult =
  | { status: 'error'; error: string }
  | { status: 'needs_confirmation'; reason: string }
  | { status: 'saved'; alerts: RuleEvaluation[] };

/* ─────────────────────────────── Peso (RF-05) ───────────────────────────── */

export interface SaveWeightInput {
  value: number;
  unit: WeightUnit;
  measuredAt: string;
  note?: string;
}

export async function saveWeight(input: SaveWeightInput): Promise<SaveResult> {
  const measuredAt = new Date(input.measuredAt);

  const validacion = validateWeight({ value: input.value, unit: input.unit, measuredAt });
  if (!validacion.ok) return { status: 'error', error: validacion.error };

  const userId = await requireUserId();
  const db = await getDb();

  const [registro] = await db
    .insert(weightRecords)
    .values({
      userId,
      value: String(input.value),
      unit: input.unit,
      measuredAt,
      source: 'manual', // RB-11
      note: input.note?.trim() || null,
    })
    .returning();

  const alerts = evaluateRules(await getActiveApprovedRules(), {
    variable: 'weight',
    value: toKg(input.value, input.unit),
  });

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'weight_record_created',
    entityType: 'weight_records',
    entityId: registro.id,
    metadata: { alertsTriggered: alerts.length },
  });

  revalidatePath('/');
  return { status: 'saved', alerts };
}

export async function listWeight(limit = 50) {
  const userId = await requireUserId();
  const db = await getDb();

  return db
    .select()
    .from(weightRecords)
    .where(and(eq(weightRecords.userId, userId), isNull(weightRecords.deletedAt)))
    // Desempate por created_at: dos mediciones del mismo minuto comparten
    // measured_at, y sin esto su orden relativo queda indefinido.
    .orderBy(desc(weightRecords.measuredAt), desc(weightRecords.createdAt))
    .limit(limit);
}

/* ───────────────────────── Presión arterial (RF-06) ─────────────────────── */

export interface SaveBloodPressureInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt: string;
  note?: string;
  confirmed?: boolean;
}

export async function saveBloodPressure(input: SaveBloodPressureInput): Promise<SaveResult> {
  const measuredAt = new Date(input.measuredAt);

  const validacion = validateBloodPressure({
    systolic: input.systolic,
    diastolic: input.diastolic,
    pulse: input.pulse,
    measuredAt,
  });

  if (!validacion.ok) return { status: 'error', error: validacion.error };

  // RF-06: "los valores atípicos solicitarán confirmación".
  if (validacion.needsConfirmation && !input.confirmed) {
    return { status: 'needs_confirmation', reason: validacion.reason ?? 'valor_inusual' };
  }

  const userId = await requireUserId();
  const db = await getDb();

  const [registro] = await db
    .insert(bloodPressureRecords)
    .values({
      userId,
      systolic: input.systolic,
      diastolic: input.diastolic,
      pulse: input.pulse ?? null,
      measuredAt,
      source: 'manual', // RB-11
      note: input.note?.trim() || null,
    })
    .returning();

  /**
   * Se evalúan las dos variables por separado y se juntan las coincidencias:
   * una regla puede referirse a la sistólica y otra a la diastólica.
   */
  const reglas = await getActiveApprovedRules();
  const alerts = [
    ...evaluateRules(reglas, { variable: 'systolic', value: input.systolic }),
    ...evaluateRules(reglas, { variable: 'diastolic', value: input.diastolic }),
  ];

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'blood_pressure_record_created',
    entityType: 'blood_pressure_records',
    entityId: registro.id,
    metadata: { alertsTriggered: alerts.length },
  });

  revalidatePath('/');
  return { status: 'saved', alerts };
}

export async function listBloodPressure(limit = 50) {
  const userId = await requireUserId();
  const db = await getDb();

  return db
    .select()
    .from(bloodPressureRecords)
    .where(
      and(eq(bloodPressureRecords.userId, userId), isNull(bloodPressureRecords.deletedAt)),
    )
    .orderBy(desc(bloodPressureRecords.measuredAt), desc(bloodPressureRecords.createdAt))
    .limit(limit);
}

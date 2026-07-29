'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { glucoseRecords, auditLogs } from '@/db/schema';
import { validateGlucose, toMgDl } from '@/domain/glucose';
import type { GlucoseContext, GlucoseUnit } from '@/domain/glucose';
import { evaluateRules } from '@/domain/rules/engine';
import type { RuleEvaluation } from '@/domain/rules/types';
import { getActiveApprovedRules } from '@/db/rules';
import { requireUserId } from '@/lib/current-user';
import { recordAlertEvents } from '@/db/alert-events';

export interface SaveGlucoseInput {
  value: number;
  unit: GlucoseUnit;
  context: GlucoseContext;
  measuredAt: string;
  note?: string;
  /** El usuario ya confirmó un valor inusual (CA-04). */
  confirmed?: boolean;
}

export type SaveGlucoseResult =
  | { status: 'error'; error: string }
  | { status: 'needs_confirmation'; reason: string }
  | { status: 'saved'; alerts: RuleEvaluation[] };

export async function saveGlucose(input: SaveGlucoseInput): Promise<SaveGlucoseResult> {
  const measuredAt = new Date(input.measuredAt);

  const validation = validateGlucose({
    value: input.value,
    unit: input.unit,
    context: input.context,
    measuredAt,
  });

  if (!validation.ok) {
    return { status: 'error', error: validation.error };
  }

  // CA-04: un valor inusual exige confirmación explícita antes de procesarse.
  if (validation.needsConfirmation && !input.confirmed) {
    return { status: 'needs_confirmation', reason: validation.reason ?? 'valor_inusual' };
  }

  const db = await getDb();
  const userId = await requireUserId();

  const [record] = await db
    .insert(glucoseRecords)
    .values({
      userId,
      value: String(input.value),
      unit: input.unit,
      context: input.context,
      measuredAt,
      source: 'manual', // RB-11
      note: input.note?.trim() || null,
    })
    .returning();

  // §12.2 paso 10: tras guardar, se evalúan las reglas aprobadas.
  const rules = await getActiveApprovedRules();
  const alerts = evaluateRules(rules, {
    variable: 'glucose',
    value: toMgDl(input.value, input.unit),
  });

  // CA-05 — el evento mostrado queda registrado.
  await recordAlertEvents(userId, record.id, alerts);

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'glucose_record_created',
    entityType: 'glucose_records',
    entityId: record.id,
    metadata: { alertsTriggered: alerts.length },
  });

  revalidatePath('/');
  return { status: 'saved', alerts };
}

export async function listGlucose(limit = 50) {
  const db = await getDb();
  const userId = await requireUserId();

  return db
    .select()
    .from(glucoseRecords)
    .where(and(eq(glucoseRecords.userId, userId), isNull(glucoseRecords.deletedAt)))
    .orderBy(desc(glucoseRecords.measuredAt), desc(glucoseRecords.createdAt))
    .limit(limit);
}

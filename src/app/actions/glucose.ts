'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { glucoseRecords, users, auditLogs } from '@/db/schema';
import { validateGlucose, toMgDl } from '@/domain/glucose';
import type { GlucoseContext, GlucoseUnit } from '@/domain/glucose';
import { evaluateRules } from '@/domain/rules/engine';
import type { RuleEvaluation } from '@/domain/rules/types';
import { getActiveApprovedRules } from '@/db/rules';

/**
 * NOTA: mientras RF-01 (autenticación) no esté implementado, estas acciones
 * operan sobre una cuenta de demostración fija. Sustituir por la sesión real
 * en la Tarea 6 del plan. No desplegar así.
 */
const DEMO_EMAIL = 'demo@ejemplo.mx';

async function getDemoUserId(): Promise<string> {
  const db = await getDb();
  const found = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (found.length > 0) return found[0].id;

  const [created] = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, passwordHash: 'demo-no-usar', status: 'active' })
    .returning();
  return created.id;
}

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
  const userId = await getDemoUserId();

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
  const userId = await getDemoUserId();

  return db
    .select()
    .from(glucoseRecords)
    .where(and(eq(glucoseRecords.userId, userId), isNull(glucoseRecords.deletedAt)))
    .orderBy(desc(glucoseRecords.measuredAt))
    .limit(limit);
}

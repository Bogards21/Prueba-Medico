'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { clinicalRules, auditLogs } from '@/db/schema';
import {
  canManageRules,
  validateRuleDraft,
  canActivateRule,
  statusAfterRuleEdit,
  ruleEditRevokesApproval,
} from '@/domain/rules/governance';
import type {
  ClinicalRule,
  RuleOperator,
  RuleStatus,
  RuleVariable,
  Severity,
} from '@/domain/rules/types';
import { getActor } from '@/lib/roles';

export type RuleResult = { ok: true; id?: string } | { ok: false; error: string };

export interface RuleInput {
  name: string;
  variable: string;
  operator: string;
  threshold: number;
  unit: string;
  severity: string;
  messageEs: string;
  protocolReference?: string;
}

function aDominio(input: RuleInput) {
  return {
    name: input.name,
    variable: input.variable as RuleVariable,
    operator: input.operator as RuleOperator,
    threshold: input.threshold,
    unit: input.unit,
    severity: input.severity as Severity,
    messageEs: input.messageEs,
    protocolReference: input.protocolReference,
  };
}

function aRegla(fila: typeof clinicalRules.$inferSelect): ClinicalRule {
  return {
    id: fila.id,
    name: fila.name,
    variable: fila.variable,
    operator: fila.operator,
    threshold: Number(fila.threshold),
    unit: fila.unit,
    severity: fila.severity,
    messageEs: fila.messageEs,
    version: fila.version,
    status: fila.status,
    approvedBy: fila.approvedBy,
    approvedAt: fila.approvedAt,
  };
}

/** §15 — toda operación sobre reglas exige responsable clínico. */
async function exigirResponsableClinico() {
  const actor = await getActor();
  if (!actor || !canManageRules(actor.role)) return null;
  return actor;
}

/* ────────────────────────────── Redacción ──────────────────────────────── */

export async function createRule(input: RuleInput): Promise<RuleResult> {
  const actor = await exigirResponsableClinico();
  if (!actor) {
    return { ok: false, error: 'Solo el responsable clínico puede gestionar reglas.' };
  }

  const validacion = validateRuleDraft(aDominio(input));
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const db = await getDb();

  const [fila] = await db
    .insert(clinicalRules)
    .values({
      name: input.name.trim(),
      variable: input.variable as RuleVariable,
      operator: input.operator as RuleOperator,
      threshold: String(input.threshold),
      unit: input.unit.trim(),
      severity: input.severity as Severity,
      messageEs: input.messageEs.trim(),
      protocolReference: input.protocolReference?.trim() || null,
      status: 'draft', // Nace en borrador y sin aprobar. Siempre.
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: 'clinical_rule_created',
    entityType: 'clinical_rules',
    entityId: fila.id,
    metadata: { name: fila.name, variable: fila.variable, threshold: input.threshold },
  });

  revalidatePath('/admin/reglas');
  return { ok: true, id: fila.id };
}

export async function updateRule(id: string, input: RuleInput): Promise<RuleResult> {
  const actor = await exigirResponsableClinico();
  if (!actor) {
    return { ok: false, error: 'Solo el responsable clínico puede gestionar reglas.' };
  }

  const validacion = validateRuleDraft(aDominio(input));
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const db = await getDb();
  const [fila] = await db.select().from(clinicalRules).where(eq(clinicalRules.id, id)).limit(1);
  if (!fila) return { ok: false, error: 'No encontramos esa regla.' };

  const actual = aRegla(fila);
  const revoca = ruleEditRevokesApproval(actual);

  /**
   * Editar devuelve la regla a borrador y borra su aprobación. El texto o el
   * umbral ya no son los que revisó el profesional, así que su firma no puede
   * seguir cubriéndolos.
   */
  await db
    .update(clinicalRules)
    .set({
      name: input.name.trim(),
      variable: input.variable as RuleVariable,
      operator: input.operator as RuleOperator,
      threshold: String(input.threshold),
      unit: input.unit.trim(),
      severity: input.severity as Severity,
      messageEs: input.messageEs.trim(),
      protocolReference: input.protocolReference?.trim() || null,
      status: statusAfterRuleEdit(actual.status),
      version: actual.version + 1, // RF-13 — la regla lleva versión.
      approvedBy: null,
      approvedAt: null,
    })
    .where(eq(clinicalRules.id, id));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: 'clinical_rule_updated',
    entityType: 'clinical_rules',
    entityId: id,
    metadata: {
      fromStatus: actual.status,
      version: actual.version + 1,
      approvalRevoked: revoca,
    },
  });

  revalidatePath('/admin/reglas');
  return { ok: true };
}

/* ────────────────────── Aprobación y puesta en marcha ──────────────────── */

export async function approveRule(id: string): Promise<RuleResult> {
  const actor = await exigirResponsableClinico();
  if (!actor) {
    return { ok: false, error: 'Solo el responsable clínico puede aprobar reglas.' };
  }

  const db = await getDb();
  const [fila] = await db.select().from(clinicalRules).where(eq(clinicalRules.id, id)).limit(1);
  if (!fila) return { ok: false, error: 'No encontramos esa regla.' };

  await db
    .update(clinicalRules)
    .set({ approvedBy: actor.userId, approvedAt: new Date() })
    .where(eq(clinicalRules.id, id));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: 'clinical_rule_approved',
    entityType: 'clinical_rules',
    entityId: id,
    metadata: { version: fila.version, name: fila.name },
  });

  revalidatePath('/admin/reglas');
  return { ok: true };
}

export async function setRuleStatus(id: string, status: RuleStatus): Promise<RuleResult> {
  const actor = await exigirResponsableClinico();
  if (!actor) {
    return { ok: false, error: 'Solo el responsable clínico puede gestionar reglas.' };
  }

  const db = await getDb();
  const [fila] = await db.select().from(clinicalRules).where(eq(clinicalRules.id, id)).limit(1);
  if (!fila) return { ok: false, error: 'No encontramos esa regla.' };

  // §22.15 y RB-02 — sin aprobación registrada, la regla no entra en producción.
  if (status === 'active' && !canActivateRule(aRegla(fila))) {
    return {
      ok: false,
      error: 'Esta regla no tiene aprobación registrada. Apruébala antes de activarla.',
    };
  }

  await db.update(clinicalRules).set({ status }).where(eq(clinicalRules.id, id));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: `clinical_rule_${status}`,
    entityType: 'clinical_rules',
    entityId: id,
    metadata: { fromStatus: fila.status, toStatus: status, version: fila.version },
  });

  revalidatePath('/admin/reglas');
  return { ok: true };
}

/* ─────────────────────────────── Lectura ───────────────────────────────── */

export async function listRules() {
  const db = await getDb();
  return db.select().from(clinicalRules).orderBy(desc(clinicalRules.createdAt));
}

export async function getRuleById(id: string) {
  const db = await getDb();
  const [fila] = await db.select().from(clinicalRules).where(eq(clinicalRules.id, id)).limit(1);
  return fila ?? null;
}

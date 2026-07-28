/**
 * Motor de reglas clínicas — RF-13, CA-05.
 *
 * Determinístico y cerrado por diseño: no razona, no infiere, no genera
 * texto. Recibe reglas aprobadas y un valor, devuelve los mensajes que ya
 * fueron redactados y aprobados por un responsable clínico.
 *
 * Restricciones que este archivo hace cumplir (§RF-13 "Restricciones"):
 *   - No generar recomendaciones clínicas abiertas.
 *   - No ajustar tratamientos ni presentar diagnósticos.
 *   - Toda regla clínica deberá ser aprobada  → isEvaluable()
 *   - Las reglas deberán poder desactivarse   → status === 'inactive'
 */

import { SEVERITY_ORDER } from './types';
import type { ClinicalRule, RuleContext, RuleEvaluation } from './types';

/**
 * RB-02 + §22.15. Una regla solo se evalúa si está activa Y aprobada.
 * Una regla en borrador nunca puede producir un mensaje al paciente, por
 * mucho que su condición se cumpla.
 */
function isEvaluable(rule: ClinicalRule): boolean {
  return (
    rule.status === 'active' &&
    rule.approvedBy !== null &&
    rule.approvedAt !== null
  );
}

function matches(rule: ClinicalRule, value: number): boolean {
  switch (rule.operator) {
    case 'gt':
      return value > rule.threshold;
    case 'gte':
      return value >= rule.threshold;
    case 'lt':
      return value < rule.threshold;
    case 'lte':
      return value <= rule.threshold;
    case 'eq':
      return value === rule.threshold;
  }
}

/**
 * Evalúa las reglas que aplican a la variable del contexto.
 *
 * Devuelve las coincidencias ordenadas por gravedad descendente (§13.6
 * "varias reglas coinciden"), para que la UI muestre primero lo más serio.
 * No muta el arreglo recibido.
 */
export function evaluateRules(
  rules: ClinicalRule[],
  ctx: RuleContext,
): RuleEvaluation[] {
  // RB-09: sin dato no hay nada que evaluar. Un hueco no es un cero.
  if (ctx.value === null) return [];
  const value = ctx.value;

  return rules
    .filter((r) => r.variable === ctx.variable && isEvaluable(r) && matches(r, value))
    .slice()
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])
    .map((r) => ({
      ruleId: r.id,
      ruleVersion: r.version,
      severity: r.severity,
      messageEs: r.messageEs,
    }));
}

/**
 * Tipos del motor de reglas clínicas — RF-13 del PRD.
 */

/** Los cinco niveles del §RF-13 "Niveles", en ese orden. */
export type Severity =
  | 'informational'
  | 'preventive'
  | 'needs_review'
  | 'seek_care'
  | 'potential_emergency';

/** RB-10: los mensajes deben diferenciar entre estos niveles. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  potential_emergency: 5,
  seek_care: 4,
  needs_review: 3,
  preventive: 2,
  informational: 1,
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  informational: 'Información',
  preventive: 'Recomendación educativa',
  needs_review: 'Advertencia',
  seek_care: 'Acción sugerida',
  potential_emergency: 'Situación potencialmente urgente',
};

export type RuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export type RuleVariable = 'glucose' | 'weight' | 'systolic' | 'diastolic';

export type RuleStatus = 'draft' | 'active' | 'inactive';

/**
 * Una regla clínica. Los campos de gobernanza (version, status, approvedBy,
 * approvedAt) no son metadatos decorativos: el motor los usa como condición
 * de ejecución. Ver §22.1-22.3 del PRD.
 */
export interface ClinicalRule {
  id: string;
  name: string;
  variable: RuleVariable;
  operator: RuleOperator;
  threshold: number;
  /** Unidad en que está expresado `threshold`. La canónica es mg/dL. */
  unit: string;
  severity: Severity;
  /** Mensaje exacto aprobado. El motor nunca genera texto propio. */
  messageEs: string;
  version: number;
  status: RuleStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface RuleContext {
  variable: RuleVariable;
  /** En la unidad canónica de la variable. `null` = sin dato (RB-09). */
  value: number | null;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleVersion: number;
  severity: Severity;
  messageEs: string;
}

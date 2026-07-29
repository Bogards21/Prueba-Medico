/**
 * Gobernanza de las reglas clínicas — RF-13, §15, §22.
 *
 * El motor (`engine.ts`) decide qué regla dispara. Este archivo decide QUIÉN
 * puede tocar las reglas y BAJO QUÉ CONDICIONES entran en producción.
 *
 * La pieza que sostiene el conjunto es la misma que en el contenido
 * educativo: editar una regla ya aprobada revoca su aprobación. Sin eso se
 * podría aprobar una regla inocua y después cambiarle el umbral o el mensaje
 * sin que ningún profesional volviera a mirarla, dejando la revisión clínica
 * como un trámite de una sola vez.
 */

import type { Role } from '../content';
import type {
  ClinicalRule,
  RuleOperator,
  RuleStatus,
  RuleVariable,
  Severity,
} from './types';

/* ────────────────────────────── Catálogos ──────────────────────────────── */

export const RULE_VARIABLES: readonly { key: RuleVariable; labelEs: string; unitEs: string }[] = [
  { key: 'glucose', labelEs: 'Glucosa', unitEs: 'mg/dL' },
  { key: 'systolic', labelEs: 'Presión sistólica', unitEs: 'mmHg' },
  { key: 'diastolic', labelEs: 'Presión diastólica', unitEs: 'mmHg' },
  { key: 'weight', labelEs: 'Peso', unitEs: 'kg' },
] as const;

export const RULE_OPERATORS: readonly { key: RuleOperator; labelEs: string }[] = [
  { key: 'gt', labelEs: 'es mayor que' },
  { key: 'gte', labelEs: 'es mayor o igual que' },
  { key: 'lt', labelEs: 'es menor que' },
  { key: 'lte', labelEs: 'es menor o igual que' },
  { key: 'eq', labelEs: 'es igual a' },
] as const;

const VARIABLES = new Set<string>(RULE_VARIABLES.map((v) => v.key));
const OPERADORES = new Set<string>(RULE_OPERATORS.map((o) => o.key));

/* ─────────────────────────────── Permisos ─────────────────────────────── */

/**
 * §15 — "Gestionar reglas clínicas: solo Responsable clínico".
 * RB-06 — "las modificaciones de reglas clínicas requerirán permisos
 * especiales". El administrador general queda fuera a propósito.
 */
export function canManageRules(role: Role): boolean {
  return role === 'clinical_reviewer';
}

/* ────────────────────────────── Validación ─────────────────────────────── */

export interface RuleDraft {
  name: string;
  variable: RuleVariable;
  operator: RuleOperator;
  threshold: number;
  unit: string;
  severity: Severity;
  messageEs: string;
  protocolReference?: string;
}

export type RuleValidation = { ok: true } | { ok: false; error: string };

const MIN_MESSAGE_LENGTH = 15;

/**
 * §22.9 — "los mensajes no deben ajustar medicamentos".
 *
 * Esto es un filtro de red, no una garantía: detecta las formulaciones más
 * evidentes para que no se cuelen por descuido. La garantía real es la
 * revisión humana, que este código no sustituye.
 */
const PATRONES_PROHIBIDOS: { regex: RegExp; motivo: string }[] = [
  {
    regex: /\b(sube|baja|aumenta|reduce|duplica|ajusta)\b[^.]{0,40}\b(dosis|tableta|unidades|insulina)\b/i,
    motivo: 'El mensaje parece indicar un cambio de dosis.',
  },
  {
    regex: /\b(deja|suspende|interrumpe|para)\s+de\s+(tomar|usar|aplicar)\b/i,
    motivo: 'El mensaje parece indicar suspender un tratamiento.',
  },
  {
    regex: /\b(no\s+tomes|no\s+te\s+apliques)\b/i,
    motivo: 'El mensaje parece indicar suspender un tratamiento.',
  },
];

export function validateRuleDraft(draft: RuleDraft): RuleValidation {
  if (!draft.name.trim()) {
    return { ok: false, error: 'Ponle un nombre a la regla.' };
  }

  if (!VARIABLES.has(draft.variable)) {
    return { ok: false, error: 'Elige una variable válida.' };
  }

  if (!OPERADORES.has(draft.operator)) {
    return { ok: false, error: 'Elige una condición válida.' };
  }

  if (!Number.isFinite(draft.threshold)) {
    return { ok: false, error: 'El umbral debe ser un número.' };
  }

  if (!draft.unit.trim()) {
    return { ok: false, error: 'Indica la unidad del umbral.' };
  }

  const mensaje = draft.messageEs.trim();
  if (mensaje.length < MIN_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `El mensaje debe estar redactado (al menos ${MIN_MESSAGE_LENGTH} caracteres). Es el texto exacto que verá la persona.`,
    };
  }

  for (const { regex, motivo } of PATRONES_PROHIBIDOS) {
    if (regex.test(mensaje)) {
      return {
        ok: false,
        error: `${motivo} La plataforma no puede indicar ni modificar tratamientos (§22 del PRD).`,
      };
    }
  }

  return { ok: true };
}

/* ─────────────────────── Aprobación y ciclo de vida ────────────────────── */

/**
 * §22.15 y RB-02 — una regla no llega a producción sin rastro de quién la
 * aprobó y cuándo. La base de datos lo repite con un CHECK, a propósito:
 * este camino y aquel tienen que fallar por separado.
 */
export function canActivateRule(rule: ClinicalRule): boolean {
  return rule.approvedBy !== null && rule.approvedAt !== null;
}

/** Editar cualquier regla que haya salido de borrador la devuelve a borrador. */
export function statusAfterRuleEdit(_current: RuleStatus): RuleStatus {
  return 'draft';
}

/** ¿La edición invalida una aprobación previa? */
export function ruleEditRevokesApproval(rule: ClinicalRule): boolean {
  return rule.approvedBy !== null || rule.approvedAt !== null || rule.status !== 'draft';
}

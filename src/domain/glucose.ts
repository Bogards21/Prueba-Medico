/**
 * Dominio de glucosa — RF-04 del PRD.
 *
 * IMPORTANTE: los umbrales de este archivo son límites TÉCNICOS de captura
 * (¿pudo el medidor producir este número?), no criterios clínicos. La
 * interpretación clínica vive exclusivamente en las reglas aprobadas del
 * motor de reglas (RF-13), donde un responsable clínico las versiona y
 * aprueba. Ver §22 del PRD.
 */

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export type GlucoseContext =
  | 'fasting'
  | 'before_meal'
  | 'after_meal'
  | 'before_sleep'
  | 'other';

/** Etiquetas es-MX para la UI (§18: lenguaje no técnico). */
export const GLUCOSE_CONTEXT_LABELS: Record<GlucoseContext, string> = {
  fasting: 'En ayuno',
  before_meal: 'Antes de comer',
  after_meal: 'Después de comer',
  before_sleep: 'Antes de dormir',
  other: 'Otro',
};

const MMOL_TO_MGDL = 18.0182;

/** Rango que un glucómetro puede producir. Fuera de esto es error de captura. */
const PLAUSIBLE_MIN_MGDL = 10;
const PLAUSIBLE_MAX_MGDL = 1000;

/**
 * Umbrales de RECONFIRMACIÓN (§22.13): "un valor fuera de rango debe
 * confirmarse cuando exista posibilidad de captura errónea". Pedir confirmar
 * no es diagnosticar — solo evita que un dedazo entre al historial.
 */
const CONFIRM_BELOW_MGDL = 50;
const CONFIRM_ABOVE_MGDL = 400;

export interface GlucoseInput {
  value: number;
  unit: GlucoseUnit;
  context: GlucoseContext;
  measuredAt: Date;
}

export type GlucoseValidation =
  | { ok: true; needsConfirmation: boolean; reason?: string }
  | { ok: false; error: string };

/** Convierte a la unidad canónica interna (mg/dL). */
export function toMgDl(value: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? value : value * MMOL_TO_MGDL;
}

/** Convierte de mg/dL a la unidad que el usuario prefiera mostrar. */
export function fromMgDl(mgdl: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? mgdl : mgdl / MMOL_TO_MGDL;
}

export function validateGlucose(input: GlucoseInput): GlucoseValidation {
  if (!Number.isFinite(input.value)) {
    return { ok: false, error: 'Introduce un número válido.' };
  }

  // §13.2: fecha futura.
  if (input.measuredAt.getTime() > Date.now()) {
    return { ok: false, error: 'La fecha no puede ser futura.' };
  }

  const mgdl = toMgDl(input.value, input.unit);

  if (mgdl < PLAUSIBLE_MIN_MGDL || mgdl > PLAUSIBLE_MAX_MGDL) {
    return {
      ok: false,
      error: 'Ese valor está fuera del rango que un medidor puede registrar. Revisa el número.',
    };
  }

  // RF-04: no rechazamos datos clínicamente posibles, solo pedimos confirmar.
  if (mgdl < CONFIRM_BELOW_MGDL) {
    return { ok: true, needsConfirmation: true, reason: 'valor_bajo_inusual' };
  }
  if (mgdl > CONFIRM_ABOVE_MGDL) {
    return { ok: true, needsConfirmation: true, reason: 'valor_alto_inusual' };
  }

  return { ok: true, needsConfirmation: false };
}

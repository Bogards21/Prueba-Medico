/**
 * Dominio de peso — RF-05 del PRD.
 *
 * Igual que en glucosa, los límites son de captura, no clínicos: descartan
 * un dedazo, no interpretan el peso de nadie.
 */

export type WeightUnit = 'kg' | 'lb';

const LB_TO_KG = 0.45359237;

const PLAUSIBLE_MIN_KG = 20;
const PLAUSIBLE_MAX_KG = 400;

export interface WeightInput {
  value: number;
  unit: WeightUnit;
  measuredAt: Date;
}

export type WeightValidation = { ok: true } | { ok: false; error: string };

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * LB_TO_KG;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / LB_TO_KG;
}

export function validateWeight(input: WeightInput): WeightValidation {
  if (!Number.isFinite(input.value)) {
    return { ok: false, error: 'Introduce un número válido.' };
  }

  if (input.measuredAt.getTime() > Date.now()) {
    return { ok: false, error: 'La fecha no puede ser futura.' };
  }

  const kg = toKg(input.value, input.unit);
  if (kg < PLAUSIBLE_MIN_KG || kg > PLAUSIBLE_MAX_KG) {
    return {
      ok: false,
      error: 'Ese peso está fuera del rango que una báscula puede registrar. Revisa el número.',
    };
  }

  return { ok: true };
}

/**
 * RF-05 — "cambio respecto al periodo anterior".
 * Sin referencia previa devuelve `null`, nunca 0: no hay cambio que mostrar
 * y presentarlo como cero sería inventar un dato (RB-09).
 */
export function weightDelta(actual: number, anterior: number | null): number | null {
  if (anterior === null) return null;
  return actual - anterior;
}

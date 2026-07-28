/**
 * Dominio de presión arterial — RF-06 del PRD.
 *
 * "El sistema validará que los datos sean numéricos" y "los valores atípicos
 * solicitarán confirmación". La interpretación clínica (¿es hipertensión?)
 * NO vive aquí: vive en las reglas aprobadas del motor (RF-13). Este archivo
 * solo distingue lo que un tensiómetro pudo producir de lo que no.
 */

const PLAUSIBLE_SYS = { min: 50, max: 300 };
const PLAUSIBLE_DIA = { min: 20, max: 200 };
const PLAUSIBLE_PULSE = { min: 20, max: 250 };

/** Umbrales de RECONFIRMACIÓN, no criterios diagnósticos. */
const CONFIRM_SYS = { below: 85, above: 180 };
const CONFIRM_DIA = { below: 50, above: 115 };

export interface BloodPressureInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt: Date;
}

export type BloodPressureValidation =
  | { ok: true; needsConfirmation: boolean; reason?: string }
  | { ok: false; error: string };

const dentro = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max;

export function validateBloodPressure(input: BloodPressureInput): BloodPressureValidation {
  const { systolic, diastolic, pulse, measuredAt } = input;

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return { ok: false, error: 'Introduce ambos números de tu medición.' };
  }

  if (pulse !== undefined && !Number.isFinite(pulse)) {
    return { ok: false, error: 'El pulso debe ser un número.' };
  }

  if (measuredAt.getTime() > Date.now()) {
    return { ok: false, error: 'La fecha no puede ser futura.' };
  }

  if (!dentro(systolic, PLAUSIBLE_SYS) || !dentro(diastolic, PLAUSIBLE_DIA)) {
    return {
      ok: false,
      error: 'Esas cifras están fuera del rango que un tensiómetro puede registrar. Revísalas.',
    };
  }

  if (systolic <= diastolic) {
    return {
      ok: false,
      error: 'La cifra alta (sistólica) debe ser mayor que la baja (diastólica). Revisa cuál es cuál.',
    };
  }

  if (pulse !== undefined && !dentro(pulse, PLAUSIBLE_PULSE)) {
    return { ok: false, error: 'Ese pulso está fuera del rango que un aparato puede registrar.' };
  }

  if (systolic > CONFIRM_SYS.above || diastolic > CONFIRM_DIA.above) {
    return { ok: true, needsConfirmation: true, reason: 'presion_alta_inusual' };
  }
  if (systolic < CONFIRM_SYS.below || diastolic < CONFIRM_DIA.below) {
    return { ok: true, needsConfirmation: true, reason: 'presion_baja_inusual' };
  }

  return { ok: true, needsConfirmation: false };
}

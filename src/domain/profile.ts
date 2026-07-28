/**
 * Perfil personal y clínico — RF-03 del PRD.
 *
 * "Solo se solicitarán datos necesarios": lo mínimo para operar es el nombre,
 * la fecha de nacimiento, la zona horaria (de la que dependen los
 * recordatorios, §13.4) y la unidad de glucosa (de la que depende cómo se
 * muestra todo). El resto queda opcional a propósito.
 */

import type { GlucoseUnit } from './glucose';

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  diagnosisYear?: number;
  heightCm?: number;
  glucoseUnit?: GlucoseUnit;
  timezone?: string;
}

export type ProfileValidation = { ok: true } | { ok: false; error: string };

/** Campos sin los cuales la plataforma no puede funcionar bien. */
export const REQUIRED_PROFILE_FIELDS = [
  'firstName',
  'birthDate',
  'glucoseUnit',
  'timezone',
] as const satisfies readonly (keyof ProfileInput)[];

const MIN_AGE = 18;
const MAX_AGE = 120;
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

const vacio = (v: unknown) => typeof v === 'string' && v.trim() === '';

function edadEn(birthDate: Date, now: Date): number {
  let edad = now.getFullYear() - birthDate.getFullYear();
  const mes = now.getMonth() - birthDate.getMonth();
  if (mes < 0 || (mes === 0 && now.getDate() < birthDate.getDate())) edad--;
  return edad;
}

export function validateProfile(input: ProfileInput, now = new Date()): ProfileValidation {
  if (!input.firstName || vacio(input.firstName)) {
    return { ok: false, error: 'Escribe tu nombre.' };
  }

  if (!input.birthDate || Number.isNaN(input.birthDate.getTime())) {
    return { ok: false, error: 'Escribe tu fecha de nacimiento.' };
  }

  if (input.birthDate.getTime() > now.getTime()) {
    return { ok: false, error: 'La fecha de nacimiento no puede ser futura.' };
  }

  const edad = edadEn(input.birthDate, now);

  // §8.1 — el producto está dirigido a personas adultas.
  if (edad < MIN_AGE) {
    return {
      ok: false,
      error: 'Esta plataforma está dirigida a personas adultas (18 años o más).',
    };
  }
  if (edad > MAX_AGE) {
    return { ok: false, error: 'Revisa tu fecha de nacimiento: la edad no parece correcta.' };
  }

  if (input.diagnosisYear !== undefined) {
    if (input.diagnosisYear > now.getFullYear()) {
      return { ok: false, error: 'El año de diagnóstico no puede ser futuro.' };
    }
    if (input.diagnosisYear < input.birthDate.getFullYear()) {
      return {
        ok: false,
        error: 'El año de diagnóstico no puede ser anterior a tu nacimiento.',
      };
    }
  }

  if (input.heightCm !== undefined) {
    if (
      !Number.isFinite(input.heightCm) ||
      input.heightCm < MIN_HEIGHT_CM ||
      input.heightCm > MAX_HEIGHT_CM
    ) {
      return { ok: false, error: 'Revisa tu estatura: debe estar entre 100 y 250 centímetros.' };
    }
  }

  return { ok: true };
}

/** Porcentaje de campos requeridos ya completados, para el dashboard. */
export function profileCompletion(input: ProfileInput): number {
  const hechos = REQUIRED_PROFILE_FIELDS.filter((campo) => {
    const v = input[campo];
    return v !== undefined && v !== null && !vacio(v);
  }).length;

  return Math.round((hechos / REQUIRED_PROFILE_FIELDS.length) * 100);
}

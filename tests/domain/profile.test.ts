import { describe, it, expect } from 'vitest';
import { validateProfile, profileCompletion, REQUIRED_PROFILE_FIELDS } from '@/domain/profile';
import type { ProfileInput } from '@/domain/profile';

const completo: ProfileInput = {
  firstName: 'Carlos',
  lastName: 'Ramírez',
  birthDate: new Date('1968-03-12'),
  diagnosisYear: 2014,
  heightCm: 172,
  glucoseUnit: 'mg/dL',
  timezone: 'America/Mexico_City',
};

const AHORA = new Date('2026-07-28T12:00:00Z');

describe('validateProfile', () => {
  it('acepta un perfil completo y coherente', () => {
    expect(validateProfile(completo, AHORA)).toEqual({ ok: true });
  });

  it('exige el nombre', () => {
    expect(validateProfile({ ...completo, firstName: '   ' }, AHORA).ok).toBe(false);
  });

  it('rechaza una fecha de nacimiento futura', () => {
    const r = validateProfile({ ...completo, birthDate: new Date('2030-01-01') }, AHORA);
    expect(r.ok).toBe(false);
  });

  // §8.1 — el producto está dirigido a personas adultas.
  it('rechaza a una persona menor de edad', () => {
    const r = validateProfile({ ...completo, birthDate: new Date('2015-01-01') }, AHORA);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/adultas|18/i);
  });

  it('rechaza una edad imposible', () => {
    expect(validateProfile({ ...completo, birthDate: new Date('1880-01-01') }, AHORA).ok).toBe(false);
  });

  it('rechaza un año de diagnóstico futuro', () => {
    expect(validateProfile({ ...completo, diagnosisYear: 2030 }, AHORA).ok).toBe(false);
  });

  it('rechaza un diagnóstico anterior al nacimiento', () => {
    expect(validateProfile({ ...completo, diagnosisYear: 1950 }, AHORA).ok).toBe(false);
  });

  it('rechaza una estatura fuera de lo posible', () => {
    expect(validateProfile({ ...completo, heightCm: 20 }, AHORA).ok).toBe(false);
    expect(validateProfile({ ...completo, heightCm: 300 }, AHORA).ok).toBe(false);
  });

  // RF-03: "solo se solicitarán datos necesarios" — el resto es opcional.
  it('acepta que falten los campos opcionales', () => {
    const r = validateProfile(
      { ...completo, lastName: undefined, diagnosisYear: undefined, heightCm: undefined },
      AHORA,
    );
    expect(r.ok).toBe(true);
  });
});

describe('profileCompletion', () => {
  it('un perfil vacío está al 0 %', () => {
    expect(profileCompletion({})).toBe(0);
  });

  it('un perfil con todos los campos requeridos está al 100 %', () => {
    expect(profileCompletion(completo)).toBe(100);
  });

  it('refleja el avance parcial', () => {
    const parcial = profileCompletion({ firstName: 'Carlos', birthDate: completo.birthDate });
    expect(parcial).toBeGreaterThan(0);
    expect(parcial).toBeLessThan(100);
  });

  it('no cuenta un campo de texto en blanco como completado', () => {
    expect(profileCompletion({ firstName: '   ' })).toBe(0);
  });

  it('los campos requeridos están declarados', () => {
    expect(REQUIRED_PROFILE_FIELDS.length).toBeGreaterThan(0);
  });
});

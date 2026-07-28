import { describe, it, expect } from 'vitest';
import { validateBloodPressure } from '@/domain/blood-pressure';

const base = { measuredAt: new Date('2026-07-01T08:00:00Z') };

describe('validateBloodPressure', () => {
  it('acepta una lectura normal', () => {
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: 78 })).toEqual({
      ok: true,
      needsConfirmation: false,
    });
  });

  it('acepta el pulso opcional', () => {
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: 78, pulse: 68 }).ok).toBe(true);
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: 78 }).ok).toBe(true);
  });

  // RF-06: "el sistema validará que los datos sean numéricos".
  it('rechaza valores no numéricos', () => {
    expect(validateBloodPressure({ ...base, systolic: Number.NaN, diastolic: 78 }).ok).toBe(false);
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: Number.NaN }).ok).toBe(false);
  });

  it('exige que la sistólica sea mayor que la diastólica', () => {
    const r = validateBloodPressure({ ...base, systolic: 80, diastolic: 120 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/alta.*baja|mayor/i);
  });

  it('rechaza cifras imposibles para un tensiómetro', () => {
    expect(validateBloodPressure({ ...base, systolic: 400, diastolic: 90 }).ok).toBe(false);
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: 5 }).ok).toBe(false);
    expect(validateBloodPressure({ ...base, systolic: 10, diastolic: 5 }).ok).toBe(false);
  });

  it('rechaza un pulso imposible', () => {
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: 78, pulse: 400 }).ok).toBe(false);
    expect(validateBloodPressure({ ...base, systolic: 120, diastolic: 78, pulse: 0 }).ok).toBe(false);
  });

  // RF-06: "los valores atípicos solicitarán confirmación".
  it('pide confirmación ante cifras atípicas pero posibles', () => {
    const alto = validateBloodPressure({ ...base, systolic: 195, diastolic: 118 });
    expect(alto.ok).toBe(true);
    expect(alto.ok && alto.needsConfirmation).toBe(true);

    const bajo = validateBloodPressure({ ...base, systolic: 82, diastolic: 48 });
    expect(bajo.ok && bajo.needsConfirmation).toBe(true);
  });

  it('rechaza una medición con fecha futura', () => {
    const r = validateBloodPressure({
      systolic: 120,
      diastolic: 78,
      measuredAt: new Date(Date.now() + 86_400_000),
    });
    expect(r.ok).toBe(false);
  });
});

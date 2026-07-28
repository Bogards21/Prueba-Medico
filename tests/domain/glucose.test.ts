import { describe, it, expect } from 'vitest';
import { toMgDl, validateGlucose } from '@/domain/glucose';

describe('toMgDl', () => {
  it('deja mg/dL sin cambios', () => {
    expect(toMgDl(120, 'mg/dL')).toBe(120);
  });

  it('convierte mmol/L a mg/dL con el factor 18.0182', () => {
    expect(toMgDl(6.5, 'mmol/L')).toBeCloseTo(117.12, 2);
  });
});

describe('validateGlucose', () => {
  const base = {
    unit: 'mg/dL' as const,
    context: 'fasting' as const,
    measuredAt: new Date('2026-07-01T08:00:00Z'),
  };

  it('acepta un valor normal sin pedir confirmación', () => {
    expect(validateGlucose({ ...base, value: 95 })).toEqual({
      ok: true,
      needsConfirmation: false,
    });
  });

  // §22.13 + CA-04: pide confirmar, NO rechaza.
  it('pide confirmación ante un valor extremo pero clínicamente posible', () => {
    const r = validateGlucose({ ...base, value: 480 });
    expect(r.ok).toBe(true);
    expect(r.ok && r.needsConfirmation).toBe(true);
  });

  // RF-04: "no debe rechazar automáticamente un dato clínicamente posible".
  it('no rechaza un valor extremo posible', () => {
    expect(validateGlucose({ ...base, value: 600 }).ok).toBe(true);
  });

  it('pide confirmación ante un valor bajo inusual', () => {
    const r = validateGlucose({ ...base, value: 38 });
    expect(r.ok && r.needsConfirmation).toBe(true);
  });

  it('rechaza valores imposibles', () => {
    expect(validateGlucose({ ...base, value: 0 }).ok).toBe(false);
    expect(validateGlucose({ ...base, value: -5 }).ok).toBe(false);
    expect(validateGlucose({ ...base, value: 3000 }).ok).toBe(false);
  });

  it('rechaza un valor no numérico', () => {
    expect(validateGlucose({ ...base, value: Number.NaN }).ok).toBe(false);
  });

  // §13.2: fecha futura.
  it('rechaza una medición con fecha futura', () => {
    const r = validateGlucose({
      ...base,
      value: 100,
      measuredAt: new Date(Date.now() + 86_400_000),
    });
    expect(r.ok).toBe(false);
  });

  it('valida el umbral de confirmación en la unidad correcta', () => {
    // 26 mmol/L ≈ 468 mg/dL → debe pedir confirmación.
    const r = validateGlucose({ ...base, value: 26, unit: 'mmol/L' });
    expect(r.ok && r.needsConfirmation).toBe(true);
  });

  it('no pide confirmación para un valor normal expresado en mmol/L', () => {
    // 6.5 mmol/L ≈ 117 mg/dL.
    expect(validateGlucose({ ...base, value: 6.5, unit: 'mmol/L' })).toEqual({
      ok: true,
      needsConfirmation: false,
    });
  });
});

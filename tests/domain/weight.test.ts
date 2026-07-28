import { describe, it, expect } from 'vitest';
import { toKg, validateWeight, weightDelta } from '@/domain/weight';

describe('toKg', () => {
  it('deja los kilogramos sin cambios', () => {
    expect(toKg(82, 'kg')).toBe(82);
  });

  it('convierte libras a kilogramos', () => {
    expect(toKg(180, 'lb')).toBeCloseTo(81.65, 2);
  });
});

describe('validateWeight', () => {
  const base = { unit: 'kg' as const, measuredAt: new Date('2026-07-01T08:00:00Z') };

  it('acepta un peso normal', () => {
    expect(validateWeight({ ...base, value: 82.5 })).toEqual({ ok: true });
  });

  it('rechaza valores fuera de lo que una báscula puede dar', () => {
    expect(validateWeight({ ...base, value: 0 }).ok).toBe(false);
    expect(validateWeight({ ...base, value: -10 }).ok).toBe(false);
    expect(validateWeight({ ...base, value: 900 }).ok).toBe(false);
  });

  it('rechaza un valor no numérico', () => {
    expect(validateWeight({ ...base, value: Number.NaN }).ok).toBe(false);
  });

  // §13.2 — fecha futura.
  it('rechaza una medición con fecha futura', () => {
    const r = validateWeight({ ...base, value: 80, measuredAt: new Date(Date.now() + 86_400_000) });
    expect(r.ok).toBe(false);
  });

  it('valida los límites en la unidad correcta', () => {
    // 900 lb ≈ 408 kg, por encima del máximo.
    expect(validateWeight({ ...base, value: 900, unit: 'lb' }).ok).toBe(false);
    // 180 lb ≈ 82 kg, válido.
    expect(validateWeight({ ...base, value: 180, unit: 'lb' }).ok).toBe(true);
  });
});

describe('weightDelta', () => {
  // RF-05: "cambio respecto al periodo anterior".
  it('calcula la diferencia entre la medición más reciente y la anterior', () => {
    expect(weightDelta(80, 82.5)).toBeCloseTo(-2.5, 2);
    expect(weightDelta(84, 82)).toBeCloseTo(2, 2);
  });

  // RB-09 — sin referencia previa no hay cambio que mostrar, y no es cero.
  it('devuelve null si no hay medición anterior', () => {
    expect(weightDelta(80, null)).toBeNull();
  });
});

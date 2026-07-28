import { describe, it, expect } from 'vitest';
import { summarize } from '@/domain/trends';

const d = (day: string) => new Date(`2026-07-${day}T09:00:00Z`);
const range = { from: d('01'), to: d('07') };

describe('summarize', () => {
  it('calcula promedio, mínimo y máximo', () => {
    const r = summarize(
      [
        { at: d('01'), value: 100 },
        { at: d('02'), value: 140 },
        { at: d('03'), value: 120 },
      ],
      range,
    );
    expect(r.average).toBe(120);
    expect(r.min).toBe(100);
    expect(r.max).toBe(140);
    expect(r.count).toBe(3);
  });

  // RB-09: "no debe presentar datos faltantes como valores normales".
  it('devuelve null, nunca 0, cuando no hay datos', () => {
    const r = summarize([], range);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.count).toBe(0);
    expect(r.hasEnoughData).toBe(false);
  });

  // RF-11: "indicadores de datos faltantes".
  it('cuenta los días sin registro dentro del rango', () => {
    const r = summarize([{ at: d('01'), value: 100 }, { at: d('03'), value: 110 }], range);
    expect(r.daysWithoutData).toBe(5); // 7 días de rango, 2 con dato
  });

  it('cuenta un solo día cuando hay varios registros en la misma fecha', () => {
    const r = summarize(
      [
        { at: new Date('2026-07-01T10:00:00Z'), value: 100 },
        { at: new Date('2026-07-01T20:00:00Z'), value: 130 },
      ],
      range,
    );
    expect(r.count).toBe(2);
    expect(r.daysWithoutData).toBe(6);
  });

  // §RF-11: "debe indicarse cuando no hay datos suficientes".
  it('marca datos insuficientes por debajo del mínimo', () => {
    expect(summarize([{ at: d('01'), value: 100 }], range).hasEnoughData).toBe(false);
    const tres = [d('01'), d('02'), d('03')].map((at) => ({ at, value: 100 }));
    expect(summarize(tres, range).hasEnoughData).toBe(true);
  });

  it('excluye puntos fuera del rango', () => {
    const r = summarize(
      [{ at: d('01'), value: 100 }, { at: new Date('2026-06-01T09:00:00Z'), value: 999 }],
      range,
    );
    expect(r.count).toBe(1);
    expect(r.max).toBe(100);
  });

  it('incluye los puntos que caen justo en los extremos del rango', () => {
    const r = summarize([{ at: range.from, value: 90 }, { at: range.to, value: 110 }], range);
    expect(r.count).toBe(2);
  });
});

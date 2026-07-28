/**
 * Agregación de tendencias — RF-11 del PRD.
 *
 * La regla que gobierna este archivo es RB-09: "el sistema no debe presentar
 * datos faltantes como valores normales". Por eso los agregados son
 * `number | null` y nunca `number` con default 0 — un promedio de cero
 * mediciones no es cero, es ausencia de dato, y la UI debe poder
 * distinguirlo.
 */

export interface TrendPoint {
  at: Date;
  value: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TrendSummary {
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
  /** RF-11: "indicadores de datos faltantes". */
  daysWithoutData: number;
  /** RF-11: "debe indicarse cuando no hay datos suficientes". */
  hasEnoughData: boolean;
}

const MIN_POINTS_FOR_TREND = 3;
const MS_PER_DAY = 86_400_000;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function summarize(points: TrendPoint[], range: DateRange): TrendSummary {
  const inRange = points.filter(
    (p) =>
      p.at.getTime() >= range.from.getTime() && p.at.getTime() <= range.to.getTime(),
  );

  const totalDays = Math.max(
    1,
    Math.round((range.to.getTime() - range.from.getTime()) / MS_PER_DAY) + 1,
  );
  const daysWithData = new Set(inRange.map((p) => dayKey(p.at))).size;

  // RB-09: sin datos devolvemos null, jamás 0.
  if (inRange.length === 0) {
    return {
      average: null,
      min: null,
      max: null,
      count: 0,
      daysWithoutData: totalDays,
      hasEnoughData: false,
    };
  }

  const values = inRange.map((p) => p.value);

  return {
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: inRange.length,
    daysWithoutData: totalDays - daysWithData,
    hasEnoughData: inRange.length >= MIN_POINTS_FOR_TREND,
  };
}

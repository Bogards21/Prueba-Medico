import { describe, it, expect } from 'vitest';
import {
  REPORT_SECTIONS,
  SCOPE_DISCLAIMER,
  validateReportRequest,
  buildReport,
  resolvePeriod,
  MAX_PERIOD_DAYS,
} from '@/domain/report';
import type { ReportSource } from '@/domain/report';

const AHORA = new Date('2026-07-28T12:00:00Z');

const peticion = (over = {}) => ({
  periodStart: new Date('2026-07-01T00:00:00Z'),
  periodEnd: new Date('2026-07-28T00:00:00Z'),
  sections: ['glucose', 'medications'] as const,
  ...over,
});

const fuente = (over: Partial<ReportSource> = {}): ReportSource => ({
  patientName: 'Carlos Ramírez',
  glucose: [
    { measuredAt: new Date('2026-07-10T14:00:00Z'), value: 112, unit: 'mg/dL', context: 'fasting', source: 'manual', note: null },
    { measuredAt: new Date('2026-07-12T14:00:00Z'), value: 140, unit: 'mg/dL', context: 'after_meal', source: 'manual', note: 'comí tarde' },
  ],
  weight: [],
  bloodPressure: [],
  medications: [
    { name: 'Metformina', doseText: '1 tableta', schedule: 'Todos los días · 08:00, 20:00', status: 'active' },
  ],
  adherence: 75,
  ...over,
});

describe('validateReportRequest', () => {
  it('acepta una petición correcta', () => {
    expect(validateReportRequest(peticion(), AHORA)).toEqual({ ok: true });
  });

  it('exige al menos una sección (RB-03: el usuario controla qué incluye)', () => {
    const r = validateReportRequest(peticion({ sections: [] }), AHORA);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/al menos una/i);
  });

  it('rechaza un periodo invertido', () => {
    const r = validateReportRequest(
      peticion({
        periodStart: new Date('2026-07-28T00:00:00Z'),
        periodEnd: new Date('2026-07-01T00:00:00Z'),
      }),
      AHORA,
    );
    expect(r.ok).toBe(false);
  });

  it('rechaza un periodo que termina en el futuro', () => {
    const r = validateReportRequest(
      peticion({ periodEnd: new Date('2027-01-01T00:00:00Z') }),
      AHORA,
    );
    expect(r.ok).toBe(false);
  });

  // §13.5 — "archivo demasiado grande".
  it('rechaza un periodo desmedido', () => {
    const r = validateReportRequest(
      peticion({
        periodStart: new Date('2020-01-01T00:00:00Z'),
        periodEnd: new Date('2026-07-28T00:00:00Z'),
      }),
      AHORA,
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain(String(MAX_PERIOD_DAYS));
  });

  it('rechaza una sección desconocida', () => {
    const r = validateReportRequest(peticion({ sections: ['diagnostico'] }), AHORA);
    expect(r.ok).toBe(false);
  });
});

describe('buildReport', () => {
  it('incluye solo las secciones pedidas (RB-03)', () => {
    const r = buildReport(peticion({ sections: ['glucose'] }), fuente(), AHORA);
    const titulos = r.sections.map((s) => s.key);
    expect(titulos).toEqual(['glucose']);
  });

  it('respeta el orden declarado del catálogo, no el de la petición', () => {
    const r = buildReport(peticion({ sections: ['medications', 'glucose'] }), fuente(), AHORA);
    expect(r.sections.map((s) => s.key)).toEqual(['glucose', 'medications']);
  });

  // RF-15: "el reporte incluirá una aclaración de alcance".
  it('siempre lleva la aclaración de alcance', () => {
    const r = buildReport(peticion(), fuente(), AHORA);
    expect(r.disclaimer).toBe(SCOPE_DISCLAIMER);
    expect(r.disclaimer.toLowerCase()).toContain('no sustituye');
  });

  it('la aclaración deja claro que no es un diagnóstico', () => {
    expect(SCOPE_DISCLAIMER.toLowerCase()).toContain('no es un diagnóstico');
  });

  // RB-11: "los datos deberán mostrar fecha y fuente".
  it('cada medición lleva fecha y origen', () => {
    const r = buildReport(peticion({ sections: ['glucose'] }), fuente(), AHORA);
    const filas = r.sections[0].rows;
    expect(filas[0].fecha).toBeTruthy();
    expect(filas[0].origen).toBe('Registro manual');
  });

  it('conserva las notas del paciente', () => {
    const r = buildReport(peticion({ sections: ['glucose'] }), fuente(), AHORA);
    expect(r.sections[0].rows.some((f) => f.nota === 'comí tarde')).toBe(true);
  });

  // §13.5 — "periodo sin datos".
  it('marca la sección como vacía en vez de omitirla en silencio', () => {
    const r = buildReport(
      peticion({ sections: ['weight'] }),
      fuente({ weight: [] }),
      AHORA,
    );
    expect(r.sections[0].isEmpty).toBe(true);
    expect(r.sections[0].emptyMessage).toMatch(/sin registros/i);
  });

  // RB-09 — la ausencia no se presenta como un valor.
  it('no inventa un resumen cuando no hay datos', () => {
    const r = buildReport(peticion({ sections: ['glucose'] }), fuente({ glucose: [] }), AHORA);
    expect(r.sections[0].summary).toBeNull();
  });

  it('resume la glucosa cuando hay datos suficientes', () => {
    const r = buildReport(peticion({ sections: ['glucose'] }), fuente(), AHORA);
    expect(r.sections[0].summary).toContain('126');
  });

  it('la adherencia se declara como autorreportada', () => {
    const r = buildReport(peticion({ sections: ['adherence'] }), fuente(), AHORA);
    expect(r.sections[0].summary).toMatch(/autorreportad/i);
  });

  it('sin adherencia registrada no reporta 0 %', () => {
    const r = buildReport(peticion({ sections: ['adherence'] }), fuente({ adherence: null }), AHORA);
    expect(r.sections[0].isEmpty).toBe(true);
    expect(r.sections[0].summary).toBeNull();
  });

  it('lleva el nombre del paciente, el periodo y la fecha de generación', () => {
    const r = buildReport(peticion(), fuente(), AHORA);
    expect(r.patientName).toBe('Carlos Ramírez');
    expect(r.periodLabel).toMatch(/2026/);
    expect(r.generatedAtLabel).toMatch(/2026/);
  });

  it('el catálogo de secciones está declarado', () => {
    expect(REPORT_SECTIONS.length).toBeGreaterThan(0);
    expect(REPORT_SECTIONS.every((s) => s.titleEs.length > 0)).toBe(true);
  });
});

describe('resolvePeriod', () => {
  const AHORA_TARDE = new Date('2026-07-28T22:55:00Z');

  /**
   * Elegir "hoy" como fecha final es el caso normal, no un caso raro: el
   * paciente arma el reporte el día de su consulta. El fin del día todavía
   * no ha ocurrido, así que se recorta al instante actual en vez de
   * rechazar la petición.
   */
  it('recorta el fin del periodo al momento actual si el día aún no termina', () => {
    const { periodEnd } = resolvePeriod('2026-07-01', '2026-07-28', AHORA_TARDE);
    expect(periodEnd.getTime()).toBe(AHORA_TARDE.getTime());
  });

  it('un día ya terminado conserva su final', () => {
    const { periodEnd } = resolvePeriod('2026-07-01', '2026-07-27', AHORA_TARDE);
    expect(periodEnd.toISOString().slice(0, 10)).toBe('2026-07-27');
    expect(periodEnd.getTime()).toBeLessThan(AHORA_TARDE.getTime());
  });

  it('el periodo empieza al inicio del día indicado', () => {
    const { periodStart } = resolvePeriod('2026-07-01', '2026-07-27', AHORA_TARDE);
    expect(periodStart.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('un periodo que empieza en el futuro sigue siendo inválido', () => {
    const p = resolvePeriod('2027-01-01', '2027-01-05', AHORA_TARDE);
    expect(validateReportRequest({ ...p, sections: ['glucose'] }, AHORA_TARDE).ok).toBe(false);
  });

  /**
   * El recorte es solo para "hoy". Un día futuro es un error del usuario y
   * debe avisarse, no corregirse en silencio cambiando lo que pidió.
   */
  it('NO recorta un día final futuro: se sigue rechazando', () => {
    const p = resolvePeriod('2026-07-01', '2026-12-31', AHORA_TARDE);
    expect(p.periodEnd.getTime()).toBeGreaterThan(AHORA_TARDE.getTime());
    expect(validateReportRequest({ ...p, sections: ['glucose'] }, AHORA_TARDE).ok).toBe(false);
  });

  it('el resultado de recortar pasa la validación', () => {
    const p = resolvePeriod('2026-07-01', '2026-07-28', AHORA_TARDE);
    expect(validateReportRequest({ ...p, sections: ['glucose'] }, AHORA_TARDE)).toEqual({
      ok: true,
    });
  });
});

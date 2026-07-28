/**
 * Reporte para la consulta — RF-15, CA-07.
 *
 * Reglas del PRD que gobiernan este archivo:
 *
 *   RB-03 / RF-15  El usuario controla qué se incluye. Nada entra en el
 *                  reporte sin que lo haya pedido, y las secciones no
 *                  solicitadas no se generan.
 *   RF-15          "El reporte incluirá una aclaración de alcance" y "no
 *                  deberá presentarse como diagnóstico".
 *   RB-11          "Los datos deberán mostrar fecha y fuente".
 *   RB-09          Un periodo sin datos se declara vacío; no se rellena con
 *                  ceros ni se omite en silencio (§13.5).
 *
 * Este módulo es puro: arma el modelo del reporte, no lo dibuja. El PDF vive
 * en `src/lib/report-pdf.ts`, para poder probar el contenido sin generar
 * bytes.
 */

import { GLUCOSE_CONTEXT_LABELS } from './glucose';
import type { GlucoseContext, GlucoseUnit } from './glucose';
import type { WeightUnit } from './weight';

export type ReportSectionKey =
  | 'glucose'
  | 'weight'
  | 'blood_pressure'
  | 'medications'
  | 'adherence';

export interface ReportSectionMeta {
  key: ReportSectionKey;
  titleEs: string;
  descriptionEs: string;
}

/** El orden de este catálogo es el orden del reporte. */
export const REPORT_SECTIONS: readonly ReportSectionMeta[] = [
  {
    key: 'glucose',
    titleEs: 'Glucosa',
    descriptionEs: 'Tus mediciones con su contexto, fecha y notas.',
  },
  { key: 'weight', titleEs: 'Peso', descriptionEs: 'Tus registros de peso.' },
  {
    key: 'blood_pressure',
    titleEs: 'Presión arterial',
    descriptionEs: 'Tus mediciones de presión y pulso.',
  },
  {
    key: 'medications',
    titleEs: 'Medicamentos',
    descriptionEs: 'Los medicamentos que registraste y sus horarios.',
  },
  {
    key: 'adherence',
    titleEs: 'Seguimiento de tomas',
    descriptionEs: 'La proporción de tomas que marcaste como cumplidas.',
  },
] as const;

const CLAVES = new Set<string>(REPORT_SECTIONS.map((s) => s.key));

/**
 * RF-15 — aclaración de alcance. Va en todos los reportes, sin excepción y
 * sin posibilidad de desactivarla: es la frontera clínica del §33 puesta por
 * escrito en el documento que el paciente le entrega a su médico.
 */
export const SCOPE_DISCLAIMER =
  'Este documento reúne la información que la persona registró por su cuenta en una ' +
  'aplicación de seguimiento. No es un diagnóstico ni un expediente clínico, y no ' +
  'sustituye la valoración de un profesional de salud. Los datos fueron capturados ' +
  'manualmente y no han sido verificados por ningún dispositivo ni por personal médico.';

export const MAX_PERIOD_DAYS = 366;

const MS_PER_DAY = 86_400_000;

/* ───────────────────────────── Entrada ─────────────────────────────────── */

export interface ReportRequest {
  periodStart: Date;
  periodEnd: Date;
  sections: readonly string[];
}

export interface GlucoseRow {
  measuredAt: Date;
  value: number;
  unit: GlucoseUnit;
  context: GlucoseContext;
  source: string;
  note: string | null;
}

export interface WeightRow {
  measuredAt: Date;
  value: number;
  unit: WeightUnit;
  source: string;
  note: string | null;
}

export interface BloodPressureRow {
  measuredAt: Date;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  source: string;
  note: string | null;
}

export interface MedicationRow {
  name: string;
  doseText: string | null;
  schedule: string;
  status: string;
}

export interface ReportSource {
  patientName: string;
  glucose: GlucoseRow[];
  weight: WeightRow[];
  bloodPressure: BloodPressureRow[];
  medications: MedicationRow[];
  /** Porcentaje autorreportado, o `null` si no hay tomas marcadas (RB-09). */
  adherence: number | null;
}

/* ───────────────────────────── Salida ──────────────────────────────────── */

export interface ReportRow {
  fecha: string;
  valor: string;
  detalle: string;
  /** RB-11 — origen del dato, visible en el documento. */
  origen: string;
  nota: string | null;
}

export interface ReportSection {
  key: ReportSectionKey;
  title: string;
  /** `null` cuando no hay datos: RB-09, la ausencia no se resume. */
  summary: string | null;
  rows: ReportRow[];
  isEmpty: boolean;
  emptyMessage: string | null;
}

export interface Report {
  patientName: string;
  periodLabel: string;
  generatedAtLabel: string;
  sections: ReportSection[];
  disclaimer: string;
}

export type ReportValidation = { ok: true } | { ok: false; error: string };

/* ──────────────────────────── Validación ───────────────────────────────── */

/**
 * Convierte las fechas del formulario (YYYY-MM-DD) en un periodo utilizable.
 *
 * El fin del periodo se recorta al instante actual cuando el día elegido
 * todavía no ha terminado. Elegir "hoy" es el caso normal —el paciente arma
 * el reporte el día de su consulta—, y sin este recorte las 23:59 de hoy
 * siempre caerían en el futuro y la petición se rechazaría.
 *
 * Las fechas se interpretan en UTC para que el periodo no dependa de la zona
 * horaria del servidor.
 */
export function resolvePeriod(
  startIso: string,
  endIso: string,
  now = new Date(),
): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(`${startIso}T00:00:00.000Z`);
  const finDelDia = new Date(`${endIso}T23:59:59.999Z`);

  // Solo se recorta cuando el día elegido es HOY. Un día futuro es un error
  // del usuario: hay que avisarle, no corregirlo en silencio cambiando lo
  // que pidió.
  const esHoy = endIso === now.toISOString().slice(0, 10);

  return { periodStart, periodEnd: esHoy ? new Date(now.getTime()) : finDelDia };
}

export function validateReportRequest(req: ReportRequest, now = new Date()): ReportValidation {
  if (req.sections.length === 0) {
    return { ok: false, error: 'Elige al menos una sección para incluir en el reporte.' };
  }

  const desconocida = req.sections.find((s) => !CLAVES.has(s));
  if (desconocida) {
    return { ok: false, error: 'Hay una sección que no reconocemos. Vuelve a elegirlas.' };
  }

  if (
    Number.isNaN(req.periodStart.getTime()) ||
    Number.isNaN(req.periodEnd.getTime())
  ) {
    return { ok: false, error: 'Revisa las fechas del periodo.' };
  }

  if (req.periodStart.getTime() > req.periodEnd.getTime()) {
    return { ok: false, error: 'La fecha de inicio debe ser anterior a la de fin.' };
  }

  if (req.periodEnd.getTime() > now.getTime()) {
    return { ok: false, error: 'El periodo no puede terminar en el futuro.' };
  }

  // §13.5 — "archivo demasiado grande".
  const dias = (req.periodEnd.getTime() - req.periodStart.getTime()) / MS_PER_DAY;
  if (dias > MAX_PERIOD_DAYS) {
    return {
      ok: false,
      error: `El periodo no puede ser mayor a ${MAX_PERIOD_DAYS} días. Elige un rango más corto.`,
    };
  }

  return { ok: true };
}

/* ──────────────────────────── Construcción ─────────────────────────────── */

const fechaLarga = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const fechaHora = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** RB-11 — el origen se muestra en palabras, no como código interno. */
function origenLegible(source: string): string {
  switch (source) {
    case 'manual':
      return 'Registro manual';
    case 'imported':
      return 'Dato importado';
    case 'device':
      return 'Dispositivo conectado';
    default:
      return 'Origen no especificado';
  }
}

const promedio = (valores: number[]) =>
  valores.reduce((a, b) => a + b, 0) / valores.length;

function seccionVacia(meta: ReportSectionMeta): ReportSection {
  return {
    key: meta.key,
    title: meta.titleEs,
    summary: null,
    rows: [],
    isEmpty: true,
    emptyMessage: 'Sin registros en el periodo seleccionado.',
  };
}

function construirSeccion(meta: ReportSectionMeta, src: ReportSource): ReportSection {
  switch (meta.key) {
    case 'glucose': {
      if (src.glucose.length === 0) return seccionVacia(meta);
      const valores = src.glucose.map((g) => g.value);
      return {
        key: meta.key,
        title: meta.titleEs,
        summary:
          `${src.glucose.length} mediciones · promedio ${Math.round(promedio(valores))} ` +
          `${src.glucose[0].unit} · mínimo ${Math.min(...valores)} · máximo ${Math.max(...valores)}`,
        rows: src.glucose.map((g) => ({
          fecha: fechaHora.format(g.measuredAt),
          valor: `${g.value} ${g.unit}`,
          detalle: GLUCOSE_CONTEXT_LABELS[g.context],
          origen: origenLegible(g.source),
          nota: g.note,
        })),
        isEmpty: false,
        emptyMessage: null,
      };
    }

    case 'weight': {
      if (src.weight.length === 0) return seccionVacia(meta);
      return {
        key: meta.key,
        title: meta.titleEs,
        summary: `${src.weight.length} registros`,
        rows: src.weight.map((w) => ({
          fecha: fechaHora.format(w.measuredAt),
          valor: `${w.value} ${w.unit}`,
          detalle: '',
          origen: origenLegible(w.source),
          nota: w.note,
        })),
        isEmpty: false,
        emptyMessage: null,
      };
    }

    case 'blood_pressure': {
      if (src.bloodPressure.length === 0) return seccionVacia(meta);
      return {
        key: meta.key,
        title: meta.titleEs,
        summary: `${src.bloodPressure.length} mediciones`,
        rows: src.bloodPressure.map((b) => ({
          fecha: fechaHora.format(b.measuredAt),
          valor: `${b.systolic}/${b.diastolic} mmHg`,
          detalle: b.pulse !== null ? `Pulso ${b.pulse}` : '',
          origen: origenLegible(b.source),
          nota: b.note,
        })),
        isEmpty: false,
        emptyMessage: null,
      };
    }

    case 'medications': {
      if (src.medications.length === 0) return seccionVacia(meta);
      return {
        key: meta.key,
        title: meta.titleEs,
        summary: `${src.medications.length} medicamentos registrados por la persona`,
        rows: src.medications.map((m) => ({
          fecha: m.schedule,
          valor: m.name,
          detalle: m.doseText ?? '',
          origen: 'Capturado por la persona',
          nota: null,
        })),
        isEmpty: false,
        emptyMessage: null,
      };
    }

    case 'adherence': {
      // RB-09 — sin tomas marcadas no hay proporción que reportar.
      if (src.adherence === null) {
        return {
          ...seccionVacia(meta),
          emptyMessage: 'No hay tomas marcadas en el periodo seleccionado.',
        };
      }
      return {
        key: meta.key,
        title: meta.titleEs,
        summary:
          `${src.adherence}% de las tomas fueron marcadas como cumplidas. ` +
          'Se trata de adherencia autorreportada: refleja lo que la persona registró, ' +
          'no una medición del tratamiento.',
        rows: [],
        isEmpty: false,
        emptyMessage: null,
      };
    }
  }
}

export function buildReport(req: ReportRequest, src: ReportSource, now = new Date()): Report {
  const pedidas = new Set(req.sections);

  return {
    patientName: src.patientName,
    periodLabel: `${fechaLarga.format(req.periodStart)} — ${fechaLarga.format(req.periodEnd)}`,
    generatedAtLabel: fechaLarga.format(now),
    // Se recorre el catálogo, no la petición: el orden del documento es
    // estable aunque el usuario marque las casillas en cualquier orden.
    sections: REPORT_SECTIONS.filter((m) => pedidas.has(m.key)).map((m) =>
      construirSeccion(m, src),
    ),
    disclaimer: SCOPE_DISCLAIMER,
  };
}

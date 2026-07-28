'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, isNull, lte, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  glucoseRecords,
  weightRecords,
  bloodPressureRecords,
  medications,
  medicationSchedules,
  medicationLogs,
  profiles,
  reports,
  auditLogs,
} from '@/db/schema';
import { validateReportRequest, buildReport, resolvePeriod } from '@/domain/report';
import type { Report, ReportSectionKey, ReportSource } from '@/domain/report';
import { adherenceRate } from '@/domain/medication';
import type { DayKey } from '@/domain/medication';
import { DAY_LABELS } from '@/domain/medication';
import type { GlucoseContext, GlucoseUnit } from '@/domain/glucose';
import type { WeightUnit } from '@/domain/weight';
import { requireUserId } from '@/lib/current-user';

export type ReportResult = { ok: true; id: string } | { ok: false; error: string };

export interface ReportRequestInput {
  periodStart: string;
  periodEnd: string;
  sections: string[];
}

function rango(input: ReportRequestInput) {
  return { ...resolvePeriod(input.periodStart, input.periodEnd), sections: input.sections };
}

function diasLegibles(patron: (DayKey | 'daily')[]): string {
  if (patron.includes('daily')) return 'Todos los días';
  return patron.map((d) => DAY_LABELS[d as DayKey]).join(', ');
}

const ESTADO_MED: Record<string, string> = {
  active: 'Activo',
  paused: 'Recordatorios pausados',
  finished: 'Tratamiento terminado',
};

/**
 * Reúne del usuario SOLO lo necesario para las secciones pedidas.
 *
 * RB-03 — el usuario controla qué comparte. Si no pidió una sección, sus
 * datos ni siquiera se leen de la base: no basta con omitirlos al dibujar.
 */
async function reunirDatos(
  userId: string,
  desde: Date,
  hasta: Date,
  secciones: Set<string>,
): Promise<ReportSource> {
  const db = await getDb();

  const [perfil] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const nombre = [perfil?.firstName, perfil?.lastName].filter(Boolean).join(' ') || 'Sin nombre';

  const fuente: ReportSource = {
    patientName: nombre,
    glucose: [],
    weight: [],
    bloodPressure: [],
    medications: [],
    adherence: null,
  };

  if (secciones.has('glucose')) {
    const filas = await db
      .select()
      .from(glucoseRecords)
      .where(
        and(
          eq(glucoseRecords.userId, userId),
          isNull(glucoseRecords.deletedAt),
          gte(glucoseRecords.measuredAt, desde),
          lte(glucoseRecords.measuredAt, hasta),
        ),
      )
      .orderBy(desc(glucoseRecords.measuredAt), desc(glucoseRecords.createdAt));

    fuente.glucose = filas.map((f) => ({
      measuredAt: f.measuredAt,
      value: Number(f.value),
      unit: f.unit as GlucoseUnit,
      context: f.context as GlucoseContext,
      source: f.source,
      note: f.note,
    }));
  }

  if (secciones.has('weight')) {
    const filas = await db
      .select()
      .from(weightRecords)
      .where(
        and(
          eq(weightRecords.userId, userId),
          isNull(weightRecords.deletedAt),
          gte(weightRecords.measuredAt, desde),
          lte(weightRecords.measuredAt, hasta),
        ),
      )
      .orderBy(desc(weightRecords.measuredAt), desc(weightRecords.createdAt));

    fuente.weight = filas.map((f) => ({
      measuredAt: f.measuredAt,
      value: Number(f.value),
      unit: f.unit as WeightUnit,
      source: f.source,
      note: f.note,
    }));
  }

  if (secciones.has('blood_pressure')) {
    const filas = await db
      .select()
      .from(bloodPressureRecords)
      .where(
        and(
          eq(bloodPressureRecords.userId, userId),
          isNull(bloodPressureRecords.deletedAt),
          gte(bloodPressureRecords.measuredAt, desde),
          lte(bloodPressureRecords.measuredAt, hasta),
        ),
      )
      .orderBy(desc(bloodPressureRecords.measuredAt), desc(bloodPressureRecords.createdAt));

    fuente.bloodPressure = filas.map((f) => ({
      measuredAt: f.measuredAt,
      systolic: f.systolic,
      diastolic: f.diastolic,
      pulse: f.pulse,
      source: f.source,
      note: f.note,
    }));
  }

  if (secciones.has('medications') || secciones.has('adherence')) {
    const meds = await db
      .select()
      .from(medications)
      .where(and(eq(medications.userId, userId), isNull(medications.deletedAt)));

    if (secciones.has('medications') && meds.length > 0) {
      const horarios = await db
        .select()
        .from(medicationSchedules)
        .where(
          inArray(
            medicationSchedules.medicationId,
            meds.map((m) => m.id),
          ),
        );

      fuente.medications = meds.map((m) => {
        const suyos = horarios.filter((h) => h.medicationId === m.id);
        const dias = (suyos[0]?.dayPattern as (DayKey | 'daily')[]) ?? [];
        const horas = suyos.map((h) => h.scheduledTime).sort().join(', ');
        return {
          name: m.name,
          doseText: m.doseText,
          schedule: [diasLegibles(dias), horas].filter(Boolean).join(' · '),
          status: ESTADO_MED[m.status] ?? m.status,
        };
      });
    }

    if (secciones.has('adherence') && meds.length > 0) {
      const logs = await db
        .select()
        .from(medicationLogs)
        .where(
          and(
            inArray(
              medicationLogs.medicationId,
              meds.map((m) => m.id),
            ),
            gte(medicationLogs.scheduledAt, desde),
            lte(medicationLogs.scheduledAt, hasta),
          ),
        );

      fuente.adherence = adherenceRate(logs.map((l) => ({ status: l.status })));
    }
  }

  return fuente;
}

/** Vista previa (RF-15) — el mismo modelo que se imprimirá, sin generar bytes. */
export async function previewReport(
  input: ReportRequestInput,
): Promise<{ ok: true; report: Report } | { ok: false; error: string }> {
  const req = rango(input);
  const validacion = validateReportRequest(req);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const userId = await requireUserId();
  const fuente = await reunirDatos(userId, req.periodStart, req.periodEnd, new Set(req.sections));

  return { ok: true, report: buildReport(req, fuente) };
}

/**
 * Registra la generación del reporte (RF-15: "registro de generación") y
 * devuelve su identificador. El PDF se produce en la ruta de descarga.
 */
export async function createReport(input: ReportRequestInput): Promise<ReportResult> {
  const req = rango(input);
  const validacion = validateReportRequest(req);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const userId = await requireUserId();
  const db = await getDb();

  const [fila] = await db
    .insert(reports)
    .values({
      userId,
      periodStart: req.periodStart,
      periodEnd: req.periodEnd,
      sections: req.sections,
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'report_generated',
    entityType: 'reports',
    entityId: fila.id,
    metadata: {
      sections: req.sections,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });

  revalidatePath('/reportes');
  return { ok: true, id: fila.id };
}

/** Datos del reporte guardado, para producir el PDF en la descarga. */
export async function getReportForDownload(
  reportId: string,
): Promise<{ ok: true; report: Report } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const db = await getDb();

  const [fila] = await db
    .select()
    .from(reports)
    // RB-03 — solo el dueño descarga su reporte.
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .limit(1);

  if (!fila) return { ok: false, error: 'No encontramos ese reporte.' };

  const secciones = (fila.sections as ReportSectionKey[]) ?? [];
  const fuente = await reunirDatos(userId, fila.periodStart, fila.periodEnd, new Set(secciones));

  const report = buildReport(
    { periodStart: fila.periodStart, periodEnd: fila.periodEnd, sections: secciones },
    fuente,
  );

  await db.insert(auditLogs).values({
    actorId: userId,
    action: 'report_downloaded',
    entityType: 'reports',
    entityId: reportId,
  });

  return { ok: true, report };
}

export async function listReports() {
  const userId = await requireUserId();
  const db = await getDb();

  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.generatedAt))
    .limit(20);
}

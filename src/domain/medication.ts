/**
 * Medicamentos y sus tomas — RF-08, RF-09, CA-06.
 *
 * Restricciones del PRD que este archivo respeta (§RF-08 "Restricciones"):
 *   - La plataforma no sugiere dosis.
 *   - No modifica tratamientos.
 *   - No recomienda suspender medicamentos.
 *
 * Aquí solo se calcula CUÁNDO tocaba una toma según lo que el paciente
 * capturó, y qué proporción marcó como cumplida. Nada de esto interpreta el
 * tratamiento.
 */

import { zonedTimeToUtc, formatInZone } from './time-zone';

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

/** Índice 0 = domingo, igual que `Date.getUTCDay()`. */
export const DAY_KEYS: readonly DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

export type MedicationStatus = 'active' | 'paused' | 'finished';

export type DoseStatus = 'pending' | 'completed' | 'skipped' | 'postponed';

export interface ScheduleSlot {
  id: string;
  /** `['daily']` o una lista de días concretos. */
  dayPattern: (DayKey | 'daily')[];
  /** Hora civil "HH:MM" en la zona del plan. */
  time: string;
  active: boolean;
}

export interface MedicationPlan {
  medicationId: string;
  status: MedicationStatus;
  startDate: Date;
  endDate: Date | null;
  timezone: string;
  schedules: ScheduleSlot[];
}

export interface Dose {
  medicationId: string;
  scheduleId: string;
  scheduledAt: Date;
}

const MS_PER_DAY = 86_400_000;

/** ¿El medicamento está vigente en ese instante? */
export function isActiveOn(plan: MedicationPlan, at: Date): boolean {
  if (plan.status !== 'active') return false;
  if (at.getTime() < plan.startDate.getTime()) return false;
  if (plan.endDate && at.getTime() > plan.endDate.getTime()) return false;
  return true;
}

function aplicaEseDia(slot: ScheduleSlot, dia: DayKey): boolean {
  return slot.dayPattern.includes('daily') || slot.dayPattern.includes(dia);
}

/**
 * Tomas previstas entre dos instantes.
 *
 * Se itera por DÍAS CIVILES de la zona del paciente, no por bloques de 24
 * horas de UTC: en un cambio de horario de verano un día civil dura 23 o 25
 * horas, y recorrer UTC se saltaría o duplicaría una toma.
 */
export function generateDoses(plan: MedicationPlan, from: Date, to: Date): Dose[] {
  // RF-08 / §13.4 — pausado o finalizado no genera nada.
  if (plan.status !== 'active') return [];

  const activos = plan.schedules.filter((s) => s.active);
  if (activos.length === 0) return [];

  const dosis: Dose[] = [];

  const inicioCivil = formatInZone(from, plan.timezone);
  // Se recorre un día extra por cada extremo para no perder tomas que caen
  // cerca del borde por diferencia de desplazamiento.
  const dias = Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY) + 2;

  for (let i = -1; i < dias; i++) {
    const base = Date.UTC(inicioCivil.year, inicioCivil.month - 1, inicioCivil.day + i);
    const cursor = new Date(base);
    const civil = {
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(),
    };
    const dia = DAY_KEYS[cursor.getUTCDay()];

    for (const slot of activos) {
      if (!aplicaEseDia(slot, dia)) continue;

      const scheduledAt = zonedTimeToUtc(civil, slot.time, plan.timezone);

      if (scheduledAt.getTime() < from.getTime()) continue;
      if (scheduledAt.getTime() >= to.getTime()) continue;
      if (!isActiveOn(plan, scheduledAt)) continue;

      dosis.push({ medicationId: plan.medicationId, scheduleId: slot.id, scheduledAt });
    }
  }

  return dosis.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

/**
 * RF-08 — "historial de adherencia autorreportada".
 *
 * Solo cuenta como cumplida la toma que el paciente marcó como tal. RF-09 es
 * explícito: "la entrega no deberá interpretarse como confirmación de
 * cumplimiento", así que una toma pendiente o pospuesta no suma.
 *
 * Devuelve `null` sin tomas: no hay adherencia que reportar, y presentarla
 * como 0 % sería afirmar un incumplimiento que nadie observó (RB-09).
 */
export function adherenceRate(logs: { status: DoseStatus }[]): number | null {
  if (logs.length === 0) return null;
  const cumplidas = logs.filter((l) => l.status === 'completed').length;
  return Math.round((cumplidas / logs.length) * 100);
}

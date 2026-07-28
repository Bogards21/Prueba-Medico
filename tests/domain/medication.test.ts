import { describe, it, expect } from 'vitest';
import {
  generateDoses,
  adherenceRate,
  isActiveOn,
  DAY_KEYS,
} from '@/domain/medication';
import type { MedicationPlan } from '@/domain/medication';

const plan = (over: Partial<MedicationPlan> = {}): MedicationPlan => ({
  medicationId: 'm1',
  status: 'active',
  startDate: new Date('2026-07-01T00:00:00Z'),
  endDate: null,
  timezone: 'America/Mexico_City',
  schedules: [{ id: 's1', dayPattern: ['daily'], time: '08:00', active: true }],
  ...over,
});

// Miércoles 2026-07-15 a domingo 2026-07-19, en horas UTC amplias.
const desde = new Date('2026-07-15T00:00:00Z');
const hasta = new Date('2026-07-20T00:00:00Z');

describe('generateDoses', () => {
  it('genera una toma diaria en el rango', () => {
    const dosis = generateDoses(plan(), desde, hasta);
    expect(dosis).toHaveLength(5);
    expect(dosis[0].scheduledAt.toISOString()).toBe('2026-07-15T14:00:00.000Z');
  });

  it('respeta la zona horaria del plan', () => {
    const enMadrid = generateDoses(plan({ timezone: 'Europe/Madrid' }), desde, hasta);
    expect(enMadrid[0].scheduledAt.toISOString()).toBe('2026-07-15T06:00:00.000Z');
  });

  it('genera varias tomas al día si hay varios horarios', () => {
    const p = plan({
      schedules: [
        { id: 's1', dayPattern: ['daily'], time: '08:00', active: true },
        { id: 's2', dayPattern: ['daily'], time: '20:00', active: true },
      ],
    });
    expect(generateDoses(p, desde, hasta)).toHaveLength(10);
  });

  it('solo genera tomas en los días indicados', () => {
    // 2026-07-15 es miércoles.
    const p = plan({ schedules: [{ id: 's1', dayPattern: ['mon', 'wed', 'fri'], time: '08:00', active: true }] });
    const dosis = generateDoses(p, desde, hasta);
    expect(dosis).toHaveLength(2); // miércoles 15 y viernes 17
  });

  // RF-08: "pausar un recordatorio sin eliminar el medicamento" (§13.4).
  it('un medicamento pausado no genera tomas', () => {
    expect(generateDoses(plan({ status: 'paused' }), desde, hasta)).toEqual([]);
  });

  it('un medicamento finalizado no genera tomas', () => {
    expect(generateDoses(plan({ status: 'finished' }), desde, hasta)).toEqual([]);
  });

  it('un horario desactivado no genera tomas', () => {
    const p = plan({ schedules: [{ id: 's1', dayPattern: ['daily'], time: '08:00', active: false }] });
    expect(generateDoses(p, desde, hasta)).toEqual([]);
  });

  it('no genera tomas antes de la fecha de inicio', () => {
    const p = plan({ startDate: new Date('2026-07-17T00:00:00Z') });
    const dosis = generateDoses(p, desde, hasta);
    expect(dosis).toHaveLength(3); // 17, 18 y 19
  });

  it('no genera tomas después de la fecha de finalización', () => {
    const p = plan({ endDate: new Date('2026-07-16T23:59:59Z') });
    expect(generateDoses(p, desde, hasta)).toHaveLength(2); // 15 y 16
  });

  it('devuelve las tomas en orden cronológico', () => {
    const p = plan({
      schedules: [
        { id: 's2', dayPattern: ['daily'], time: '20:00', active: true },
        { id: 's1', dayPattern: ['daily'], time: '08:00', active: true },
      ],
    });
    const tiempos = generateDoses(p, desde, hasta).map((d) => d.scheduledAt.getTime());
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b));
  });

  it('cada toma sabe de qué horario viene', () => {
    expect(generateDoses(plan(), desde, hasta)[0].scheduleId).toBe('s1');
  });

  it('las claves de día cubren la semana completa', () => {
    expect(DAY_KEYS).toHaveLength(7);
  });
});

describe('isActiveOn', () => {
  it('un medicamento activo dentro de su periodo lo está', () => {
    expect(isActiveOn(plan(), new Date('2026-07-15T12:00:00Z'))).toBe(true);
  });

  it('no lo está antes de empezar ni después de terminar', () => {
    expect(isActiveOn(plan(), new Date('2026-06-01T12:00:00Z'))).toBe(false);
    const p = plan({ endDate: new Date('2026-07-10T00:00:00Z') });
    expect(isActiveOn(p, new Date('2026-07-15T12:00:00Z'))).toBe(false);
  });
});

describe('adherenceRate', () => {
  // RF-08: "historial de adherencia autorreportada".
  it('calcula el porcentaje de tomas marcadas como completadas', () => {
    expect(adherenceRate([
      { status: 'completed' }, { status: 'completed' },
      { status: 'skipped' }, { status: 'completed' },
    ])).toBe(75);
  });

  /**
   * RF-09: "la entrega no deberá interpretarse como confirmación de
   * cumplimiento". Una toma pendiente no cuenta como cumplida.
   */
  it('una toma pendiente NO cuenta como cumplida', () => {
    expect(adherenceRate([{ status: 'completed' }, { status: 'pending' }])).toBe(50);
  });

  it('una toma pospuesta tampoco cuenta como cumplida', () => {
    expect(adherenceRate([{ status: 'completed' }, { status: 'postponed' }])).toBe(50);
  });

  // RB-09 — sin tomas no hay adherencia que reportar, y no es 0 %.
  it('devuelve null cuando no hay tomas registradas', () => {
    expect(adherenceRate([])).toBeNull();
  });

  it('redondea a un entero', () => {
    expect(adherenceRate([{ status: 'completed' }, { status: 'skipped' }, { status: 'skipped' }])).toBe(33);
  });
});

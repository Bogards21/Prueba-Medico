import { describe, it, expect } from 'vitest';
import { zonedTimeToUtc, formatInZone } from '@/domain/time-zone';

describe('zonedTimeToUtc', () => {
  // México ya no aplica horario de verano desde 2022: siempre UTC-6.
  it('convierte una hora local de Ciudad de México a UTC', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 7, day: 15 }, '08:00', 'America/Mexico_City');
    expect(utc.toISOString()).toBe('2026-07-15T14:00:00.000Z');
  });

  it('funciona igual en invierno, porque esa zona ya no cambia de horario', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 1, day: 15 }, '08:00', 'America/Mexico_City');
    expect(utc.toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  /**
   * §13.4 — "cambio de horario estacional". Las 08:00 locales deben seguir
   * siendo las 08:00 locales aunque el desplazamiento respecto a UTC cambie.
   */
  it('respeta el horario de verano en una zona que sí lo aplica', () => {
    const invierno = zonedTimeToUtc({ year: 2026, month: 1, day: 15 }, '08:00', 'America/New_York');
    const verano = zonedTimeToUtc({ year: 2026, month: 7, day: 15 }, '08:00', 'America/New_York');

    expect(invierno.toISOString()).toBe('2026-01-15T13:00:00.000Z'); // EST, UTC-5
    expect(verano.toISOString()).toBe('2026-07-15T12:00:00.000Z'); // EDT, UTC-4
  });

  it('maneja zonas al este de Greenwich', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 7, day: 15 }, '09:30', 'Europe/Madrid');
    expect(utc.toISOString()).toBe('2026-07-15T07:30:00.000Z'); // CEST, UTC+2
  });

  it('acepta la medianoche', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 7, day: 15 }, '00:00', 'America/Mexico_City');
    expect(utc.toISOString()).toBe('2026-07-15T06:00:00.000Z');
  });
});

describe('formatInZone', () => {
  it('devuelve la fecha civil que le corresponde en esa zona', () => {
    // 2026-07-15T02:00Z son todavía las 20:00 del día 14 en Ciudad de México.
    const d = new Date('2026-07-15T02:00:00Z');
    expect(formatInZone(d, 'America/Mexico_City')).toEqual({
      year: 2026,
      month: 7,
      day: 14,
      hour: 20,
      minute: 0,
    });
  });

  it('coincide consigo mismo al ida y vuelta', () => {
    const original = { year: 2026, month: 3, day: 9 };
    const utc = zonedTimeToUtc(original, '07:45', 'America/New_York');
    const vuelta = formatInZone(utc, 'America/New_York');
    expect(vuelta).toEqual({ ...original, hour: 7, minute: 45 });
  });
});

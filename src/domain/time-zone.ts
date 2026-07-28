/**
 * Conversión entre hora civil y UTC — soporte para RF-09 y §13.4.
 *
 * El PRD exige que "los recordatorios respetarán la zona horaria" y enumera
 * como casos de borde el cambio de zona y el "cambio de horario estacional".
 * Guardar un recordatorio como "todos los días a las 08:00" y resolverlo a un
 * instante UTC solo cuando toca es lo único que sobrevive a un cambio de
 * horario de verano: si se guardara el instante UTC, en octubre la alarma
 * sonaría a las 07:00 o a las 09:00.
 *
 * Se usa `Intl` en lugar de una librería de fechas porque el motor de
 * JavaScript ya trae la base de datos IANA de zonas horarias, y esa base se
 * actualiza con el runtime.
 */

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface CivilDateTime extends CivilDate {
  hour: number;
  minute: number;
}

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(timeZone: string): Intl.DateTimeFormat {
  let f = formateadores.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formateadores.set(timeZone, f);
  }
  return f;
}

/** Descompone un instante en la fecha y hora civiles de una zona. */
export function formatInZone(date: Date, timeZone: string): CivilDateTime {
  const partes = Object.fromEntries(
    formateador(timeZone)
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;

  return {
    year: partes.year,
    month: partes.month,
    day: partes.day,
    // Intl usa 24 para la medianoche en algunos entornos.
    hour: partes.hour % 24,
    minute: partes.minute,
  };
}

/** Desplazamiento de la zona respecto a UTC, en milisegundos, en ese instante. */
function offsetMs(date: Date, timeZone: string): number {
  const c = formatInZone(date, timeZone);
  const comoSiFueraUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute);
  // Se descartan los segundos a propósito: los horarios son de minuto exacto.
  const sinSegundos = Math.floor(date.getTime() / 60_000) * 60_000;
  return comoSiFueraUtc - sinSegundos;
}

/**
 * Convierte una hora civil de una zona al instante UTC correspondiente.
 *
 * Dos pasadas: la primera estima el desplazamiento, la segunda lo corrige
 * para las fechas que caen justo en un cambio de horario, donde el
 * desplazamiento del instante estimado y el del real difieren.
 */
export function zonedTimeToUtc(fecha: CivilDate, hora: string, timeZone: string): Date {
  const [hh, mm] = hora.split(':').map(Number);
  const comoUtc = Date.UTC(fecha.year, fecha.month - 1, fecha.day, hh, mm);

  let ts = comoUtc - offsetMs(new Date(comoUtc), timeZone);
  ts = comoUtc - offsetMs(new Date(ts), timeZone);

  return new Date(ts);
}

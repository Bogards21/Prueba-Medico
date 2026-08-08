import { negocio, reglasReserva, type DiaSemana, type HorarioDia } from '@/data/negocio';

/** Convierte "HH:mm" a minutos desde medianoche. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function aHHMM(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "19:30" -> "7:30 PM" */
export function formatoAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

export function horarioDe(fecha: Date, horarios: HorarioDia[] = negocio.horarios.valor): HorarioDia | null {
  const dia = fecha.getDay() as DiaSemana;
  return horarios.find((h) => h.dia === dia) ?? null;
}

export function estaCerrado(fecha: Date, horarios?: HorarioDia[]): boolean {
  const h = horarioDe(fecha, horarios);
  return !h || h.abre === null || h.cierra === null;
}

/**
 * Cierre después de medianoche (ej. abre 17:00, cierra 01:00) se trata como
 * el mismo día de operación: se le suman 1440 minutos al cierre.
 */
function ventanaOperacion(h: HorarioDia): { inicio: number; fin: number } | null {
  if (h.abre === null || h.cierra === null) return null;
  const inicio = aMinutos(h.abre);
  let fin = aMinutos(h.cierra);
  if (fin <= inicio) fin += 1440;
  return { inicio, fin };
}

export function estaAbiertoAhora(ahora = new Date(), horarios?: HorarioDia[]): {
  abierto: boolean;
  cierraA: string | null;
  abreA: string | null;
} {
  const lista = horarios ?? negocio.horarios.valor;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  // El día de hoy
  const hoy = horarioDe(ahora, lista);
  if (hoy) {
    const v = ventanaOperacion(hoy);
    if (v && minutosAhora >= v.inicio && minutosAhora < v.fin) {
      return { abierto: true, cierraA: aHHMM(v.fin), abreA: null };
    }
  }

  // Cierre de ayer que se extiende a la madrugada de hoy
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  const horarioAyer = horarioDe(ayer, lista);
  if (horarioAyer) {
    const v = ventanaOperacion(horarioAyer);
    if (v && v.fin > 1440 && minutosAhora < v.fin - 1440) {
      return { abierto: true, cierraA: aHHMM(v.fin), abreA: null };
    }
  }

  // Cerrado: buscar la próxima apertura dentro de 7 días
  for (let i = 0; i < 8; i++) {
    const f = new Date(ahora);
    f.setDate(f.getDate() + i);
    const h = horarioDe(f, lista);
    if (!h?.abre) continue;
    if (i === 0 && aMinutos(h.abre) <= minutosAhora) continue;
    return { abierto: false, cierraA: null, abreA: h.abre };
  }

  return { abierto: false, cierraA: null, abreA: null };
}

/**
 * Franjas reservables de un día.
 * Aplica: horario de operación, intervalo configurado, antelación mínima
 * y el margen antes del cierre (PRD RN-08, RN-09).
 */
export function franjasDisponibles(
  fecha: Date,
  opciones: {
    ahora?: Date;
    horarios?: HorarioDia[];
    bloqueadas?: string[]; // ["19:00", ...]
  } = {},
): string[] {
  const { ahora = new Date(), horarios, bloqueadas = [] } = opciones;
  const h = horarioDe(fecha, horarios);
  if (!h) return [];
  const v = ventanaOperacion(h);
  if (!v) return [];

  const { intervaloMinutos, antelacionMinimaHoras } = reglasReserva;

  // La última franja debe dejar margen de una hora antes del cierre.
  const ultimaFranja = v.fin - 60;

  const esHoy = fecha.toDateString() === ahora.toDateString();
  const minimoHoy = esHoy
    ? ahora.getHours() * 60 + ahora.getMinutes() + antelacionMinimaHoras * 60
    : -Infinity;

  const franjas: string[] = [];
  for (let t = v.inicio; t <= ultimaFranja; t += intervaloMinutos) {
    if (t < minimoHoy) continue;
    const etiqueta = aHHMM(t);
    if (bloqueadas.includes(etiqueta)) continue;
    franjas.push(etiqueta);
  }
  return franjas;
}

/** Fecha mínima y máxima seleccionables en el calendario. */
export function rangoFechas(ahora = new Date()): { min: Date; max: Date } {
  const min = new Date(ahora);
  min.setHours(0, 0, 0, 0);
  const max = new Date(min);
  max.setDate(max.getDate() + reglasReserva.diasMaximosAnticipacion);
  return { min, max };
}

export function aISOFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

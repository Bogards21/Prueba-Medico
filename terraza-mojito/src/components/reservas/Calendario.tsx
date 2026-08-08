'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { aISOFecha, estaCerrado, franjasDisponibles, rangoFechas } from '@/lib/horarios';

const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Índice de columna (0 = lunes) para un getDay() de JS (0 = domingo). */
const columna = (diaJS: number) => (diaJS + 6) % 7;

export function Calendario({
  seleccionada,
  onSeleccionar,
}: {
  seleccionada: string | null;
  onSeleccionar: (fechaISO: string) => void;
}) {
  const { min, max } = useMemo(() => rangoFechas(), []);
  const [mesVisible, setMesVisible] = useState(() => new Date(min.getFullYear(), min.getMonth(), 1));

  const celdas = useMemo(() => {
    const primero = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    const huecos = columna(primero.getDay());

    const salida: (Date | null)[] = Array(huecos).fill(null);
    for (let d = 1; d <= diasEnMes; d++) {
      salida.push(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d));
    }
    return salida;
  }, [mesVisible]);

  const puedeRetroceder =
    mesVisible.getFullYear() > min.getFullYear() ||
    (mesVisible.getFullYear() === min.getFullYear() && mesVisible.getMonth() > min.getMonth());

  const puedeAvanzar =
    mesVisible.getFullYear() < max.getFullYear() ||
    (mesVisible.getFullYear() === max.getFullYear() && mesVisible.getMonth() < max.getMonth());

  const moverMes = (delta: number) =>
    setMesVisible((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  /**
   * Un día se deshabilita si está fuera de rango, si el negocio cierra, o si
   * ya no quedan franjas reservables hoy por la antelación mínima.
   * PRD §15: "impedir fechas no disponibles", no rechazarlas después.
   */
  function motivoBloqueo(dia: Date): string | null {
    if (dia < min) return 'Fecha pasada';
    if (dia > max) return 'Fuera del rango de reservas';
    if (estaCerrado(dia)) return 'Cerrado';
    if (franjasDisponibles(dia).length === 0) return 'Sin horarios disponibles';
    return null;
  }

  return (
    <div className="tarjeta p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moverMes(-1)}
          disabled={!puedeRetroceder}
          className="btn-fantasma"
        >
          <ChevronLeft aria-hidden size={20} />
          <span className="sr-only">Mes anterior</span>
        </button>
        <p aria-live="polite" className="dato text-base capitalize text-noche">
          {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => moverMes(1)}
          disabled={!puedeAvanzar}
          className="btn-fantasma"
        >
          <ChevronRight aria-hidden size={20} />
          <span className="sr-only">Mes siguiente</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendario de reservas">
        {DIAS_CORTOS.map((d, i) => (
          <div
            key={`${d}${i}`}
            role="columnheader"
            className="dato pb-2 text-center text-xs text-carbon/50"
          >
            {d}
          </div>
        ))}

        {celdas.map((dia, i) => {
          if (!dia) return <div key={`hueco-${i}`} />;

          const iso = aISOFecha(dia);
          const bloqueo = motivoBloqueo(dia);
          const activa = seleccionada === iso;

          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              disabled={Boolean(bloqueo)}
              aria-pressed={activa}
              aria-label={`${dia.getDate()} de ${MESES[dia.getMonth()]}${bloqueo ? `, ${bloqueo}` : ''}`}
              onClick={() => onSeleccionar(iso)}
              className={`flex aspect-square items-center justify-center rounded-sm text-[15px] font-semibold transition-colors ${
                activa
                  ? 'bg-hoja text-espuma'
                  : bloqueo
                    ? 'cursor-not-allowed text-carbon/25 line-through'
                    : 'bg-lima-pale/50 text-noche hover:bg-menta'
              }`}
            >
              {dia.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-carbon/60">
        Los días tachados están cerrados o ya sin horarios disponibles.
      </p>
    </div>
  );
}

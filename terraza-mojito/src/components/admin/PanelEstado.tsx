'use client';

import { useState, useTransition } from 'react';
import { ETIQUETA_ESTADO, MOTIVOS_RECHAZO, type EstadoReserva } from '@/lib/tipos';
import { accionCambiarEstado } from '@/app/admin/acciones';

/**
 * Transiciones permitidas desde cada estado (PRD §19).
 * Una reserva rechazada o completada es terminal: no se reabre, se crea otra.
 */
const TRANSICIONES: Record<EstadoReserva, EstadoReserva[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function PanelEstado({
  reservaId,
  estadoActual,
}: {
  reservaId: string;
  estadoActual: EstadoReserva;
}) {
  const [confirmando, setConfirmando] = useState<EstadoReserva | null>(null);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_RECHAZO[0]);
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const posibles = TRANSICIONES[estadoActual];

  function ejecutar(nuevo: EstadoReserva, textoMotivo?: string) {
    setError(null);
    iniciar(async () => {
      const r = await accionCambiarEstado(reservaId, nuevo, textoMotivo);
      if (!r.ok) setError(r.error ?? 'No se pudo actualizar.');
      else setConfirmando(null);
    });
  }

  if (posibles.length === 0) {
    return (
      <section className="tarjeta p-6">
        <h2 className="display mb-2 text-xl">Estado</h2>
        <p className="text-carbon/75">
          Esta reserva está en <strong>{ETIQUETA_ESTADO[estadoActual].toLowerCase()}</strong> y
          ya no admite más cambios. Si el cliente vuelve a escribir, crea una reserva
          nueva.
        </p>
      </section>
    );
  }

  return (
    <section className="tarjeta p-6">
      <h2 className="display mb-4 text-xl">Cambiar estado</h2>

      {error && (
        <p role="alert" className="mb-4 rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {posibles.map((estado) => (
          <button
            key={estado}
            type="button"
            disabled={pendiente}
            onClick={() =>
              estado === 'rejected' ? setConfirmando('rejected') : ejecutar(estado)
            }
            className={
              estado === 'confirmed' || estado === 'completed'
                ? 'btn-primario w-full text-sm'
                : 'btn-secundario w-full text-sm'
            }
          >
            {ETIQUETA_ESTADO[estado]}
          </button>
        ))}
      </div>

      {confirmando === 'rejected' && (
        <div className="mt-5 border-t border-borde pt-5">
          <label htmlFor="motivo-detalle" className="etiqueta">
            Motivo del rechazo
          </label>
          <select
            id="motivo-detalle"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="campo"
          >
            {MOTIVOS_RECHAZO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {motivo === 'Otro' && (
            <input
              aria-label="Especifica el motivo"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Especifica el motivo"
              className="campo mt-2"
            />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendiente || (motivo === 'Otro' && !detalle.trim())}
              onClick={() => ejecutar('rejected', motivo === 'Otro' ? detalle : motivo)}
              className="btn-primario text-sm"
            >
              {pendiente ? 'Guardando…' : 'Rechazar reserva'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(null)}
              className="btn-fantasma text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

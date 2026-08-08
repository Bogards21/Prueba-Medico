'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { MOTIVOS_RECHAZO } from '@/lib/tipos';
import { accionCambiarEstado } from '@/app/admin/acciones';

/**
 * Confirmar / rechazar desde la lista.
 * PRD RN-03: rechazar exige motivo, así que abre un diálogo en vez de
 * ejecutarse de un clic.
 */
export function AccionesRapidas({ reservaId }: { reservaId: string }) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_RECHAZO[0]);
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function ejecutar(estado: string, textoMotivo?: string) {
    setError(null);
    iniciar(async () => {
      const r = await accionCambiarEstado(reservaId, estado, textoMotivo);
      if (!r.ok) setError(r.error ?? 'No se pudo completar la acción.');
      else setRechazando(false);
    });
  }

  return (
    <div className="w-full sm:w-auto">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => ejecutar('confirmed')}
          className="btn-primario flex-1 text-sm sm:flex-none"
        >
          <Check aria-hidden size={16} />
          Confirmar
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => setRechazando((v) => !v)}
          aria-expanded={rechazando}
          className="btn-secundario flex-1 text-sm sm:flex-none"
        >
          <X aria-hidden size={16} />
          Rechazar
        </button>
      </div>

      {rechazando && (
        <div className="mt-3 rounded-md border-2 border-borde bg-espuma p-4">
          <label htmlFor={`motivo-${reservaId}`} className="etiqueta">
            Motivo del rechazo
          </label>
          <select
            id={`motivo-${reservaId}`}
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

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pendiente || (motivo === 'Otro' && !detalle.trim())}
              onClick={() => ejecutar('rejected', motivo === 'Otro' ? detalle : motivo)}
              className="btn-primario text-sm"
            >
              {pendiente ? 'Guardando…' : 'Confirmar rechazo'}
            </button>
            <button
              type="button"
              onClick={() => setRechazando(false)}
              className="btn-fantasma text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

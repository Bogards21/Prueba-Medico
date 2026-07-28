'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setMedicationStatus } from '@/app/actions/medications';
import type { MedicationStatus } from '@/domain/medication';

const boton =
  'rounded-lg border-2 border-slate-400 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-60';

/**
 * RF-08 — pausar y reanudar. No hay opción de "suspender el tratamiento":
 * el §RF-08 prohíbe que la plataforma recomiende suspender medicamentos, y
 * pausar el recordatorio es una acción de la app, no del tratamiento.
 */
export function MedicamentoAcciones({
  id,
  status,
}: {
  id: string;
  status: MedicationStatus;
}) {
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const cambiar = (nuevo: MedicationStatus) =>
    startTransition(async () => {
      await setMedicationStatus(id, nuevo);
      router.refresh();
    });

  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {status === 'active' && (
        <button type="button" disabled={pendiente} onClick={() => cambiar('paused')} className={boton}>
          Pausar recordatorios
        </button>
      )}

      {status === 'paused' && (
        <button type="button" disabled={pendiente} onClick={() => cambiar('active')} className={boton}>
          Reanudar recordatorios
        </button>
      )}

      {status !== 'finished' && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => cambiar('finished')}
          className={boton}
        >
          Ya terminé este tratamiento
        </button>
      )}

      {status === 'finished' && (
        <button type="button" disabled={pendiente} onClick={() => cambiar('active')} className={boton}>
          Volver a activarlo
        </button>
      )}
    </div>
  );
}

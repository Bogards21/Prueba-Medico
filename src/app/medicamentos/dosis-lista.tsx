'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { markDose } from '@/app/actions/medications';
import type { DoseView } from '@/app/actions/medications';
import type { DoseStatus } from '@/domain/medication';

const hora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });

const ETIQUETA_ESTADO: Record<DoseStatus, string> = {
  pending: 'Pendiente',
  completed: 'Tomada',
  skipped: 'Omitida',
  postponed: 'Pospuesta',
};

export function DosisLista({ dosis }: { dosis: DoseView[] }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function marcar(d: DoseView, status: DoseStatus) {
    setError(null);
    startTransition(async () => {
      const r = await markDose(d.medicationId, d.scheduledAt.toISOString(), status);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  if (dosis.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-lg text-slate-700">Hoy no tienes tomas programadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-900">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {dosis.map((d) => (
          <li
            key={`${d.medicationId}-${d.scheduledAt.toISOString()}`}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xl font-semibold text-slate-900">{d.medicationName}</p>
              <time
                dateTime={d.scheduledAt.toISOString()}
                className="text-lg tabular-nums text-slate-700"
              >
                {hora.format(d.scheduledAt)}
              </time>
            </div>

            {d.doseText && <p className="mt-1 text-base text-slate-600">{d.doseText}</p>}

            {d.status === 'pending' ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => marcar(d, 'completed')}
                  className="rounded-lg bg-teal-800 px-5 py-3 text-lg font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:opacity-60"
                >
                  Ya la tomé
                </button>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => marcar(d, 'skipped')}
                  className="rounded-lg border-2 border-slate-400 px-5 py-3 text-lg font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-60"
                >
                  No la tomé
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {/* §17.6 — el estado no se comunica solo por color. */}
                <p className="text-lg font-medium text-slate-800">
                  {ETIQUETA_ESTADO[d.status]}
                </p>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => marcar(d, 'pending')}
                  className="rounded-lg px-3 py-2 text-base font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900 disabled:opacity-60"
                >
                  Deshacer
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

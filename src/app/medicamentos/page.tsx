import Link from 'next/link';
import { DosisLista } from './dosis-lista';
import { MedicamentoAcciones } from './medicamento-acciones';
import { getTodayDoses, listMedications, getAdherence } from '@/app/actions/medications';
import { DAY_LABELS } from '@/domain/medication';
import type { DayKey } from '@/domain/medication';

export const metadata = { title: 'Medicamentos' };
export const dynamic = 'force-dynamic';

const ETIQUETA_ESTADO = {
  active: 'Activo',
  paused: 'Recordatorios pausados',
  finished: 'Tratamiento terminado',
} as const;

function diasLegibles(patron: (DayKey | 'daily')[]): string {
  if (patron.includes('daily')) return 'Todos los días';
  return patron.map((d) => DAY_LABELS[d as DayKey]).join(', ');
}

export default async function MedicamentosPage() {
  const [dosis, medicamentos, adherencia] = await Promise.all([
    getTodayDoses(),
    listMedications(),
    getAdherence(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Medicamentos</h1>
        <Link
          href="/medicamentos/nuevo"
          className="rounded-lg bg-teal-800 px-5 py-3 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          Añadir
        </Link>
      </div>

      <section aria-labelledby="hoy-titulo" className="space-y-3">
        <h2 id="hoy-titulo" className="text-xl font-semibold text-slate-900">
          Tus tomas de hoy
        </h2>
        <DosisLista dosis={dosis} />
      </section>

      <section aria-labelledby="adherencia-titulo" className="space-y-3">
        <h2 id="adherencia-titulo" className="text-xl font-semibold text-slate-900">
          Tu seguimiento
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {/* RB-09 — sin tomas marcadas no hay adherencia que reportar, y no es 0 %. */}
          {adherencia === null ? (
            <p className="text-lg text-slate-700">
              Todavía no hay tomas marcadas en los últimos 30 días.
            </p>
          ) : (
            <>
              <p className="text-base text-slate-600">
                Tomas marcadas como cumplidas en los últimos 30 días
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                {adherencia}%
              </p>
            </>
          )}
          {/* RF-09 — la entrega de un recordatorio no confirma cumplimiento. */}
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Este dato es lo que tú registras, no una medición del tratamiento. Coméntalo con
            tu profesional de salud.
          </p>
        </div>
      </section>

      <section aria-labelledby="lista-titulo" className="space-y-3">
        <h2 id="lista-titulo" className="text-xl font-semibold text-slate-900">
          Tus medicamentos
        </h2>

        {medicamentos.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-lg text-slate-700">Aún no has añadido ningún medicamento.</p>
            <p className="mt-2 text-base text-slate-600">
              Añádelos para recibir recordatorios y llevar tu seguimiento.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {medicamentos.map((m) => (
              <li key={m.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xl font-semibold text-slate-900">{m.name}</p>
                {m.presentation && <p className="text-base text-slate-600">{m.presentation}</p>}
                {m.doseText && <p className="text-base text-slate-700">{m.doseText}</p>}
                <p className="mt-1 text-base text-slate-600">
                  {diasLegibles(m.dayPattern)} · {m.times.join(', ')}
                </p>
                {m.instructions && (
                  <p className="mt-1 text-base italic text-slate-600">{m.instructions}</p>
                )}
                <p className="mt-2 text-base font-medium text-slate-800">
                  {ETIQUETA_ESTADO[m.status]}
                </p>
                <MedicamentoAcciones id={m.id} status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewReport, createReport } from '@/app/actions/reports';
import { REPORT_SECTIONS } from '@/domain/report';
import type { Report, ReportSectionKey } from '@/domain/report';

const campo =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';
const etiqueta = 'block text-base font-medium text-slate-800';

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function ReporteForm() {
  const hoy = new Date();
  const haceUnMes = new Date(hoy.getTime() - 30 * 86_400_000);

  const [periodStart, setPeriodStart] = useState(iso(haceUnMes));
  const [periodEnd, setPeriodEnd] = useState(iso(hoy));
  /**
   * RB-03 — el usuario controla qué incluye. Se parte de las secciones de
   * seguimiento marcadas por comodidad, pero todas se pueden desmarcar y
   * ninguna se envía sin que él lo decida.
   */
  const [secciones, setSecciones] = useState<Set<ReportSectionKey>>(
    () => new Set<ReportSectionKey>(['glucose', 'weight', 'blood_pressure']),
  );
  const [vista, setVista] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const alternar = (k: ReportSectionKey) =>
    setSecciones((prev) => {
      const s = new Set(prev);
      s.has(k) ? s.delete(k) : s.add(k);
      return s;
    });

  function verVistaPrevia() {
    setError(null);
    setVista(null);
    startTransition(async () => {
      const r = await previewReport({ periodStart, periodEnd, sections: [...secciones] });
      if (!r.ok) setError(r.error);
      else setVista(r.report);
    });
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const r = await createReport({ periodStart, periodEnd, sections: [...secciones] });
      if (!r.ok) setError(r.error);
      else {
        router.refresh();
        // La descarga abre la ruta que produce el PDF.
        window.location.href = `/reportes/${r.id}/pdf`;
      }
    });
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="periodo-titulo" className="space-y-3">
        <h2 id="periodo-titulo" className="text-xl font-semibold text-slate-900">
          ¿Qué periodo quieres incluir?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="periodStart" className={etiqueta}>
              Desde
            </label>
            <input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className={campo}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="periodEnd" className={etiqueta}>
              Hasta
            </label>
            <input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className={campo}
            />
          </div>
        </div>
      </section>

      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold text-slate-900">
          ¿Qué información quieres compartir?
        </legend>
        <p className="text-base leading-relaxed text-slate-600">
          Solo se incluirá lo que marques. Lo que dejes sin marcar no aparecerá en el
          documento.
        </p>

        {REPORT_SECTIONS.map((s) => (
          <label
            key={s.key}
            className={`flex cursor-pointer gap-4 rounded-lg border-2 p-4 ${
              secciones.has(s.key)
                ? 'border-teal-700 bg-teal-50'
                : 'border-slate-300 bg-white hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              checked={secciones.has(s.key)}
              onChange={() => alternar(s.key)}
              className="mt-1 h-6 w-6 shrink-0 accent-teal-700"
            />
            <span>
              <span className="block text-lg font-medium text-slate-900">{s.titleEs}</span>
              <span className="mt-1 block text-base leading-relaxed text-slate-700">
                {s.descriptionEs}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg leading-relaxed text-red-900"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={verVistaPrevia}
        disabled={pendiente}
        className="w-full rounded-lg border-2 border-teal-800 px-6 py-4 text-lg font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? 'Preparando…' : 'Ver vista previa'}
      </button>

      {vista && (
        <section
          aria-labelledby="vista-titulo"
          className="space-y-4 rounded-xl border-2 border-slate-300 bg-white p-5"
        >
          <h2 id="vista-titulo" className="text-xl font-semibold text-slate-900">
            Vista previa
          </h2>

          <div className="text-base text-slate-700">
            <p>Persona: {vista.patientName}</p>
            <p>Periodo: {vista.periodLabel}</p>
          </div>

          {/* RF-15 — la aclaración de alcance se ve antes de confirmar. */}
          <p className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base leading-relaxed text-amber-950">
            {vista.disclaimer}
          </p>

          {vista.sections.map((s) => (
            <div key={s.key} className="border-t border-slate-200 pt-3">
              <h3 className="text-lg font-semibold text-slate-900">{s.title}</h3>

              {s.isEmpty ? (
                <p className="mt-1 text-base italic text-slate-600">{s.emptyMessage}</p>
              ) : (
                <>
                  {s.summary && <p className="mt-1 text-base text-slate-800">{s.summary}</p>}
                  {s.rows.length > 0 && (
                    <p className="mt-1 text-base text-slate-600">
                      {s.rows.length} {s.rows.length === 1 ? 'registro' : 'registros'} en el
                      documento
                    </p>
                  )}
                </>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={confirmar}
            disabled={pendiente}
            className="w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendiente ? 'Generando…' : 'Generar y descargar PDF'}
          </button>

          {/* RF-15 — "no se compartirá automáticamente". */}
          <p className="text-base leading-relaxed text-slate-600">
            El documento se descarga a tu dispositivo. Tú decides a quién se lo entregas;
            esta plataforma no lo envía a nadie por su cuenta.
          </p>
        </section>
      )}
    </div>
  );
}

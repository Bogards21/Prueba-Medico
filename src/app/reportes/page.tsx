import { ReporteForm } from './reporte-form';
import { listReports } from '@/app/actions/reports';
import { REPORT_SECTIONS } from '@/domain/report';
import type { ReportSectionKey } from '@/domain/report';

export const metadata = { title: 'Reportes' };
export const dynamic = 'force-dynamic';

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const TITULOS = new Map<ReportSectionKey, string>(
  REPORT_SECTIONS.map((s) => [s.key, s.titleEs]),
);

export default async function ReportesPage() {
  const anteriores = await listReports();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Resumen para tu consulta
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Arma un documento con lo que tú elijas para llevárselo a tu profesional de salud.
        </p>
      </div>

      <ReporteForm />

      {anteriores.length > 0 && (
        <section aria-labelledby="anteriores-titulo" className="space-y-3">
          <h2 id="anteriores-titulo" className="text-xl font-semibold text-slate-900">
            Reportes que ya generaste
          </h2>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {anteriores.map((r) => {
              const secciones = (r.sections as ReportSectionKey[]) ?? [];
              return (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="text-lg font-medium text-slate-900">
                      {fecha.format(r.periodStart)} — {fecha.format(r.periodEnd)}
                    </p>
                    <p className="text-base text-slate-600">
                      {secciones.map((s) => TITULOS.get(s) ?? s).join(', ')}
                    </p>
                    <p className="text-base text-slate-600">
                      Generado el {fecha.format(r.generatedAt)}
                    </p>
                  </div>
                  <a
                    href={`/reportes/${r.id}/pdf`}
                    className="rounded-lg border-2 border-teal-800 px-4 py-3 text-base font-medium text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
                  >
                    Descargar PDF
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

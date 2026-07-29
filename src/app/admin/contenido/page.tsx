import Link from 'next/link';
import { EstadoAcciones } from './estado-acciones';
import { listContentForAdmin } from '@/app/actions/content';
import { requireRole } from '@/lib/roles';
import { CONTENT_CATEGORIES, isReviewStale } from '@/domain/content';
import type { ContentStatus, Role } from '@/domain/content';

export const metadata = { title: 'Contenido' };
export const dynamic = 'force-dynamic';

const ETIQUETA_CAT = new Map<string, string>(
  CONTENT_CATEGORIES.map((c) => [c.key, c.labelEs]),
);

/** §17.6 — el estado no se comunica solo por color: va escrito. */
const ETIQUETA_ESTADO: Record<ContentStatus, string> = {
  draft: 'Borrador',
  in_review: 'En revisión clínica',
  approved: 'Aprobado, sin publicar',
  published: 'Publicado',
  retired: 'Retirado',
};

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminContenidoPage() {
  const actor = await requireRole('admin', 'editor', 'clinical_reviewer');
  const articulos = await listContentForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Contenido</h1>
          <p className="mt-1 text-base text-slate-600">
            Tu rol: {actor.role === 'clinical_reviewer' ? 'responsable clínico' : actor.role}
          </p>
        </div>
        <Link
          href="/admin/contenido/nuevo"
          className="rounded-lg bg-teal-800 px-5 py-3 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          Nuevo
        </Link>
      </div>

      {articulos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg text-slate-700">Todavía no hay contenido.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {articulos.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
                {ETIQUETA_CAT.get(a.category) ?? a.category}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{a.title}</p>
              <p className="text-base text-slate-600">Autor o fuente: {a.author}</p>

              <p className="mt-2 text-base font-medium text-slate-800">
                {ETIQUETA_ESTADO[a.status]} · versión {a.version}
              </p>

              {a.clinicalReviewDate ? (
                <p className="text-base text-slate-600">
                  Revisión clínica del {fecha.format(a.clinicalReviewDate)}
                  {/* RF-12 — el contenido vencido se señala. */}
                  {isReviewStale(a.clinicalReviewDate) && ' · vencida, oculta al paciente'}
                </p>
              ) : (
                <p className="text-base text-slate-600">Sin aprobación clínica registrada</p>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href={`/admin/contenido/${a.id}`}
                  className="rounded-lg border-2 border-teal-800 px-4 py-2 text-base font-medium text-teal-800 hover:bg-teal-50"
                >
                  Editar
                </Link>
              </div>

              <EstadoAcciones id={a.id} status={a.status} role={actor.role as Role} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

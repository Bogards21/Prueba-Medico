import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedContentBySlug } from '@/app/actions/content';
import { CONTENT_CATEGORIES } from '@/domain/content';

export const dynamic = 'force-dynamic';

const ETIQUETA = new Map<string, string>(
  CONTENT_CATEGORIES.map((c) => [c.key, c.labelEs]),
);

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function ArticuloPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const articulo = await getPublishedContentBySlug(slug);

  if (!articulo) notFound();

  return (
    <article className="space-y-5">
      <Link
        href="/aprender"
        className="inline-block text-base font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
      >
        Volver a Aprender
      </Link>

      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
          {ETIQUETA.get(articulo.category) ?? articulo.category}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          {articulo.title}
        </h1>
      </div>

      {articulo.summary && (
        <p className="text-lg leading-relaxed text-slate-700">{articulo.summary}</p>
      )}

      <div className="space-y-4 text-lg leading-relaxed text-slate-900">
        {articulo.body.split('\n\n').map((parrafo, i) => (
          <p key={i}>{parrafo}</p>
        ))}
      </div>

      {/* RF-12 — autor o fuente, fecha de revisión y versión, a la vista. */}
      <footer className="border-t border-slate-200 pt-4 text-base text-slate-600">
        <p>Autor o fuente: {articulo.author}</p>
        {articulo.clinicalReviewDate && (
          <p>Revisado por un profesional de salud el {fecha.format(articulo.clinicalReviewDate)}</p>
        )}
        <p>Versión {articulo.version}</p>
      </footer>
    </article>
  );
}

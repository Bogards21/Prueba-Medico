import Link from 'next/link';
import { listPublishedContent } from '@/app/actions/content';
import { CONTENT_CATEGORIES } from '@/domain/content';

export const metadata = { title: 'Aprender' };
export const dynamic = 'force-dynamic';

const ETIQUETA = new Map<string, string>(
  CONTENT_CATEGORIES.map((c) => [c.key, c.labelEs]),
);

export default async function AprenderPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const articulos = await listPublishedContent(categoria);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Aprender</h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Material revisado por un profesional de salud, en lenguaje sencillo.
        </p>
      </div>

      <nav aria-label="Categorías" className="flex flex-wrap gap-2">
        <Link
          href="/aprender"
          className={`rounded-lg border-2 px-4 py-2 text-base font-medium ${
            !categoria
              ? 'border-teal-700 bg-teal-50 text-teal-900'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Todo
        </Link>
        {CONTENT_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/aprender?categoria=${c.key}`}
            className={`rounded-lg border-2 px-4 py-2 text-base font-medium ${
              categoria === c.key
                ? 'border-teal-700 bg-teal-50 text-teal-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {c.labelEs}
          </Link>
        ))}
      </nav>

      {articulos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg text-slate-700">Todavía no hay material publicado aquí.</p>
          <p className="mt-2 text-base text-slate-600">
            El contenido aparece cuando un profesional de salud lo aprueba.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {articulos.map((a) => (
            <li key={a.id}>
              <Link
                href={`/aprender/${a.slug}`}
                className="block rounded-xl border-2 border-slate-300 bg-white px-5 py-4 hover:border-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <span className="block text-sm font-medium uppercase tracking-wide text-slate-600">
                  {ETIQUETA.get(a.category) ?? a.category}
                </span>
                <span className="mt-1 block text-xl font-semibold text-slate-900">{a.title}</span>
                {a.summary && (
                  <span className="mt-1 block text-base leading-relaxed text-slate-700">
                    {a.summary}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

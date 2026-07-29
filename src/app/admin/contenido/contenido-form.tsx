'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createContent, updateContent } from '@/app/actions/content';
import { CONTENT_CATEGORIES } from '@/domain/content';

const campo =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';
const etiqueta = 'block text-base font-medium text-slate-800';

const TIPOS = [
  { key: 'article', labelEs: 'Artículo' },
  { key: 'infographic', labelEs: 'Infografía' },
  { key: 'video', labelEs: 'Video' },
  { key: 'faq', labelEs: 'Preguntas frecuentes' },
  { key: 'guide', labelEs: 'Guía' },
  { key: 'microlesson', labelEs: 'Microlección' },
];

export interface ContenidoInicial {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  type: string;
  category: string;
  author: string;
  status: string;
}

export function ContenidoForm({ inicial }: { inicial?: ContenidoInicial }) {
  const [title, setTitle] = useState(inicial?.title ?? '');
  const [summary, setSummary] = useState(inicial?.summary ?? '');
  const [body, setBody] = useState(inicial?.body ?? '');
  const [type, setType] = useState(inicial?.type ?? 'article');
  const [category, setCategory] = useState(inicial?.category ?? CONTENT_CATEGORIES[0].key);
  const [author, setAuthor] = useState(inicial?.author ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const editando = Boolean(inicial);
  const perderaAprobacion =
    editando && (inicial!.status === 'published' || inicial!.status === 'approved');

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const datos = { title, summary, body, type, category, author };
      const r = editando
        ? await updateContent(inicial!.id, datos)
        : await createContent(datos);

      if (!r.ok) setError(r.error);
      else {
        router.push('/admin/contenido');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      {/* CA-09 — se avisa ANTES de guardar, no después. */}
      {perderaAprobacion && (
        <p className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base leading-relaxed text-amber-950">
          Este contenido ya tenía aprobación clínica. Al guardar los cambios volverá a
          revisión y necesitará una nueva aprobación antes de publicarse.
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className={etiqueta}>
          Título
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={campo}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="summary" className={etiqueta}>
          Resumen <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={campo}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="category" className={etiqueta}>
            Categoría
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={campo}
          >
            {CONTENT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.labelEs}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="type" className={etiqueta}>
            Formato
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={campo}
          >
            {TIPOS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.labelEs}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="author" className={etiqueta}>
          Autor o fuente
        </label>
        <input
          id="author"
          required
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          aria-describedby="author-ayuda"
          className={campo}
        />
        {/* RF-12 — "todo contenido debe tener autor o fuente". */}
        <p id="author-ayuda" className="text-base text-slate-600">
          Obligatorio. Puede ser una persona o la guía clínica de referencia.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="body" className={etiqueta}>
          Contenido
        </label>
        <textarea
          id="body"
          rows={12}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={campo}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg leading-relaxed text-red-900"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear borrador'}
      </button>
    </form>
  );
}

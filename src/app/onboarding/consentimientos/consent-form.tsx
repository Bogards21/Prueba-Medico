'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptConsents } from '@/app/actions/auth';
import type { ConsentDocument, ConsentType } from '@/domain/consent';

export function ConsentForm({
  obligatorios,
  opcionales,
}: {
  obligatorios: ConsentDocument[];
  opcionales: ConsentDocument[];
}) {
  /**
   * RF-02: "los consentimientos opcionales no podrán estar preseleccionados".
   * El estado inicial parte de `defaultChecked`, que el catálogo fija en
   * `false` para todos los opcionales.
   */
  const [marcados, setMarcados] = useState<Set<ConsentType>>(
    () => new Set([...obligatorios, ...opcionales].filter((d) => d.defaultChecked).map((d) => d.type)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const alternar = (t: ConsentType) =>
    setMarcados((prev) => {
      const s = new Set(prev);
      s.has(t) ? s.delete(t) : s.add(t);
      return s;
    });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await acceptConsents([...marcados]);
      if (!r.ok) setError(r.error);
      else {
        router.push('/');
        router.refresh();
      }
    });
  }

  const Documento = ({ doc, obligatorio }: { doc: ConsentDocument; obligatorio: boolean }) => (
    <label
      key={doc.type}
      className={`flex cursor-pointer gap-4 rounded-lg border-2 p-4 ${
        marcados.has(doc.type)
          ? 'border-teal-700 bg-teal-50'
          : 'border-slate-300 bg-white hover:bg-slate-50'
      }`}
    >
      <input
        type="checkbox"
        checked={marcados.has(doc.type)}
        onChange={() => alternar(doc.type)}
        className="mt-1 h-6 w-6 shrink-0 accent-teal-700"
      />
      <span>
        <span className="block text-lg font-medium text-slate-900">
          {doc.titleEs}
          {obligatorio && <span className="ml-2 text-base font-normal text-slate-600">(necesario)</span>}
        </span>
        <span className="mt-1 block text-base leading-relaxed text-slate-700">{doc.summaryEs}</span>
        {/* RF-02: cada consentimiento tiene versión y el usuario la ve. */}
        <span className="mt-1 block text-sm text-slate-500">Versión {doc.version}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={enviar} className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold text-slate-900">
          Necesarios para usar la plataforma
        </legend>
        {obligatorios.map((d) => (
          <Documento key={d.type} doc={d} obligatorio />
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xl font-semibold text-slate-900">Opcionales</legend>
        <p className="text-base leading-relaxed text-slate-600">
          Puedes dejarlos sin marcar y cambiarlos después. No afectan tu acceso.
        </p>
        {opcionales.map((d) => (
          <Documento key={d.type} doc={d} obligatorio={false} />
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
        type="submit"
        disabled={pendiente}
        className="w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? 'Guardando…' : 'Aceptar y continuar'}
      </button>
    </form>
  );
}

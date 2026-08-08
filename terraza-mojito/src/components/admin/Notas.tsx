'use client';

import { useState, useTransition } from 'react';
import { Lock } from 'lucide-react';
import type { NotaCliente } from '@/lib/tipos';
import { accionAgregarNota } from '@/app/admin/acciones';

/**
 * Notas internas del equipo.
 * PRD RN-06: nunca se muestran al cliente. El candado y la leyenda existen
 * para que quien escribe lo tenga presente.
 */
export function Notas({
  clienteId,
  notas,
}: {
  clienteId: string;
  notas: NotaCliente[];
}) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await accionAgregarNota(clienteId, texto);
      if (r.ok) setTexto('');
      else setError(r.error ?? 'No se pudo guardar la nota.');
    });
  }

  return (
    <section>
      <h2 className="display mb-1 flex items-center gap-2 text-2xl">
        <Lock aria-hidden size={18} className="text-hoja" />
        Notas internas
      </h2>
      <p className="mb-4 text-sm text-carbon/60">Solo las ve el equipo.</p>

      <form onSubmit={guardar} className="tarjeta p-5">
        <label htmlFor="nota" className="etiqueta">
          Nueva nota
        </label>
        <textarea
          id="nota"
          rows={3}
          maxLength={500}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Prefiere mesa en la terraza. Suele llegar 15 min tarde."
          className="campo resize-y"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pendiente || !texto.trim()}
          className="btn-primario mt-3 w-full text-sm"
        >
          {pendiente ? 'Guardando…' : 'Guardar nota'}
        </button>
      </form>

      {notas.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notas.map((n) => (
            <li key={n.id} className="tarjeta p-4">
              <p className="whitespace-pre-wrap text-carbon/90">{n.note}</p>
              <p className="mt-2 text-xs text-carbon/55">
                {n.author} ·{' '}
                {new Date(n.created_at).toLocaleString('es-MX', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeContentStatus } from '@/app/actions/content';
import { canTransition } from '@/domain/content';
import type { ContentStatus, Role } from '@/domain/content';

const boton =
  'rounded-lg border-2 border-slate-400 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-60';

const ACCIONES: { to: ContentStatus; labelEs: string }[] = [
  { to: 'in_review', labelEs: 'Enviar a revisión' },
  { to: 'approved', labelEs: 'Aprobar' },
  { to: 'published', labelEs: 'Publicar' },
  { to: 'retired', labelEs: 'Retirar' },
  { to: 'draft', labelEs: 'Devolver a borrador' },
];

/**
 * Los botones se filtran por rol, pero eso es solo comodidad: la acción de
 * servidor vuelve a comprobar el permiso. Ocultar un botón no protege nada.
 */
export function EstadoAcciones({
  id,
  status,
  role,
}: {
  id: string;
  status: ContentStatus;
  role: Role;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const disponibles = ACCIONES.filter((a) => canTransition(role, status, a.to));

  function cambiar(destino: ContentStatus) {
    setError(null);
    startTransition(async () => {
      const r = await changeContentStatus(id, destino);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  if (disponibles.length === 0 && !error) {
    return (
      <p className="mt-3 text-base text-slate-600">
        No hay acciones disponibles para tu rol en este estado.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-3">
        {disponibles.map((a) => (
          <button
            key={a.to}
            type="button"
            disabled={pendiente}
            onClick={() => cambiar(a.to)}
            className={boton}
          >
            {a.labelEs}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 text-base text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}

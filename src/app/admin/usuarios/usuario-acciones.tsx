'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignRole, setAccountSuspended } from '@/app/actions/admin';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/domain/admin';
import type { Role } from '@/domain/content';

const boton =
  'rounded-lg border-2 border-slate-400 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-60';

export function UsuarioAcciones({
  id,
  role,
  suspendida,
  esYoMismo,
}: {
  id: string;
  role: Role;
  suspendida: boolean;
  esYoMismo: boolean;
}) {
  const [seleccion, setSeleccion] = useState<Role>(role);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'No se pudo completar la acción.');
      else router.refresh();
    });
  };

  /**
   * Nadie actúa sobre su propia cuenta. Se explica en pantalla en vez de
   * ocultar los controles: si no se dice, parece un fallo.
   */
  if (esYoMismo) {
    return (
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Esta es tu cuenta. No puedes cambiar tu propio rol ni suspenderte; pídeselo a otro
        administrador.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={`rol-${id}`} className="block text-base font-medium text-slate-800">
            Rol
          </label>
          <select
            id={`rol-${id}`}
            value={seleccion}
            onChange={(e) => setSeleccion(e.target.value as Role)}
            className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-base text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={pendiente || seleccion === role}
          onClick={() => correr(() => assignRole(id, seleccion))}
          className={boton}
        >
          Cambiar rol
        </button>

        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => setAccountSuspended(id, !suspendida))}
          className={boton}
        >
          {suspendida ? 'Reactivar cuenta' : 'Suspender cuenta'}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 text-base leading-relaxed text-red-900"
        >
          {error}
        </p>
      )}
    </div>
  );
}

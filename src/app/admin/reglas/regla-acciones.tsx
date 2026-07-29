'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveRule, setRuleStatus } from '@/app/actions/rules';
import type { RuleStatus } from '@/domain/rules/types';

const boton =
  'rounded-lg border-2 border-slate-400 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-60';

export function ReglaAcciones({
  id,
  status,
  aprobada,
}: {
  id: string;
  status: RuleStatus;
  aprobada: boolean;
}) {
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

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-3">
        {!aprobada && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(() => approveRule(id))}
            className={boton}
          >
            Aprobar
          </button>
        )}

        {status !== 'active' && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(() => setRuleStatus(id, 'active'))}
            className={boton}
          >
            Activar
          </button>
        )}

        {/* §22.5 — "el sistema debe permitir desactivar una regla". */}
        {status === 'active' && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(() => setRuleStatus(id, 'inactive'))}
            className={boton}
          >
            Desactivar
          </button>
        )}
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

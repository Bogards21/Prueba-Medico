'use client';

import { SEVERITY_LABELS } from '@/domain/rules/types';
import type { RuleEvaluation } from '@/domain/rules/types';

/** Piezas compartidas por los formularios de registro. §17.6 y §18.4. */

export const campo =
  'rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';

export const etiqueta = 'block text-base font-medium text-slate-800';

export const botonGuardar =
  'w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50';

/** Formato datetime-local en la zona del navegador. */
export function ahoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ErrorMensaje({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg leading-relaxed text-red-900"
    >
      {children}
    </p>
  );
}

/** §22.13 — confirmación explícita de un valor inusual, sin interpretarlo. */
export function Confirmacion({
  mensaje,
  onConfirmar,
  onCorregir,
  pendiente,
}: {
  mensaje: string;
  onConfirmar: () => void;
  onCorregir: () => void;
  pendiente: boolean;
}) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="confirmar-titulo"
      className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4"
    >
      <h2 id="confirmar-titulo" className="text-lg font-semibold text-amber-950">
        Confirma el valor
      </h2>
      <p className="mt-2 text-lg leading-relaxed text-amber-950">{mensaje}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={pendiente}
          className="rounded-lg bg-amber-700 px-5 py-3 text-lg font-medium text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:opacity-60"
        >
          Sí, el valor es correcto
        </button>
        <button
          type="button"
          onClick={onCorregir}
          className="rounded-lg border-2 border-amber-700 px-5 py-3 text-lg font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
        >
          Voy a corregirlo
        </button>
      </div>
    </div>
  );
}

/** RB-10 — cada mensaje declara su nivel; el texto viene de la regla aprobada. */
export function Guardado({ alertas }: { alertas: RuleEvaluation[] }) {
  return (
    <div className="space-y-3">
      <p
        role="status"
        className="rounded-lg border-2 border-teal-300 bg-teal-50 px-4 py-3 text-lg text-teal-900"
      >
        Listo, guardamos tu registro.
      </p>

      {alertas.map((a) => (
        <div
          key={`${a.ruleId}-${a.ruleVersion}`}
          role="alert"
          className="rounded-lg border-2 border-slate-300 bg-white px-4 py-3"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {SEVERITY_LABELS[a.severity]}
          </p>
          <p className="mt-1 text-lg leading-relaxed text-slate-900">{a.messageEs}</p>
        </div>
      ))}
    </div>
  );
}

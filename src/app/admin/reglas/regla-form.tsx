'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRule, updateRule } from '@/app/actions/rules';
import { RULE_VARIABLES, RULE_OPERATORS } from '@/domain/rules/governance';
import { SEVERITY_LABELS } from '@/domain/rules/types';
import type { Severity } from '@/domain/rules/types';

const campo =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';
const etiqueta = 'block text-base font-medium text-slate-800';

const SEVERIDADES: Severity[] = [
  'informational',
  'preventive',
  'needs_review',
  'seek_care',
  'potential_emergency',
];

export interface ReglaInicial {
  id: string;
  name: string;
  variable: string;
  operator: string;
  threshold: string;
  unit: string;
  severity: string;
  messageEs: string;
  protocolReference: string | null;
  status: string;
  approvedBy: string | null;
}

export function ReglaForm({ inicial }: { inicial?: ReglaInicial }) {
  const [name, setName] = useState(inicial?.name ?? '');
  const [variable, setVariable] = useState(inicial?.variable ?? 'glucose');
  const [operator, setOperator] = useState(inicial?.operator ?? 'gt');
  const [threshold, setThreshold] = useState(inicial?.threshold ?? '');
  const [unit, setUnit] = useState(inicial?.unit ?? 'mg/dL');
  const [severity, setSeverity] = useState(inicial?.severity ?? 'needs_review');
  const [messageEs, setMessageEs] = useState(inicial?.messageEs ?? '');
  const [protocolReference, setProtocolReference] = useState(inicial?.protocolReference ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const editando = Boolean(inicial);
  const perderaAprobacion = editando && inicial!.approvedBy !== null;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const datos = {
        name,
        variable,
        operator,
        threshold: Number(threshold),
        unit,
        severity,
        messageEs,
        protocolReference,
      };

      const r = editando ? await updateRule(inicial!.id, datos) : await createRule(datos);

      if (!r.ok) setError(r.error);
      else {
        router.push('/admin/reglas');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      {perderaAprobacion && (
        <p className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base leading-relaxed text-amber-950">
          Esta regla ya estaba aprobada. Al guardar volverá a borrador y dejará de evaluarse
          hasta que la apruebes y la actives de nuevo.
        </p>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className={etiqueta}>
          Nombre de la regla
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={campo}
        />
      </div>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-2 text-base font-medium text-slate-800">Condición</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="variable" className={etiqueta}>
              Variable
            </label>
            <select
              id="variable"
              value={variable}
              onChange={(e) => {
                setVariable(e.target.value);
                const v = RULE_VARIABLES.find((x) => x.key === e.target.value);
                if (v) setUnit(v.unitEs);
              }}
              className={campo}
            >
              {RULE_VARIABLES.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.labelEs}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="operator" className={etiqueta}>
              Condición
            </label>
            <select
              id="operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className={campo}
            >
              {RULE_OPERATORS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.labelEs}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="threshold" className={etiqueta}>
              Umbral
            </label>
            <input
              id="threshold"
              type="number"
              step="any"
              required
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={campo}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="unit" className={etiqueta}>
              Unidad
            </label>
            <input
              id="unit"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={campo}
            />
          </div>
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="severity" className={etiqueta}>
          Nivel
        </label>
        <select
          id="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className={campo}
        >
          {SEVERIDADES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="messageEs" className={etiqueta}>
          Mensaje que verá la persona
        </label>
        <textarea
          id="messageEs"
          rows={4}
          required
          value={messageEs}
          onChange={(e) => setMessageEs(e.target.value)}
          aria-describedby="mensaje-ayuda"
          className={campo}
        />
        {/* §22.8 y §22.9 — el mensaje no diagnostica ni ajusta medicamentos. */}
        <p id="mensaje-ayuda" className="text-base leading-relaxed text-slate-600">
          Se mostrará tal cual, sin que el sistema lo reescriba. No debe diagnosticar ni
          indicar cambios de medicación.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="protocolReference" className={etiqueta}>
          Protocolo de referencia{' '}
          <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <input
          id="protocolReference"
          value={protocolReference}
          onChange={(e) => setProtocolReference(e.target.value)}
          placeholder="Guía o documento en el que se basa"
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

'use client';

import { useState, useTransition } from 'react';
import { GLUCOSE_CONTEXT_LABELS } from '@/domain/glucose';
import type { GlucoseContext, GlucoseUnit } from '@/domain/glucose';
import { SEVERITY_LABELS } from '@/domain/rules/types';
import type { RuleEvaluation } from '@/domain/rules/types';
import { saveGlucose } from '@/app/actions/glucose';

/** Formato datetime-local en la zona del navegador. */
function ahoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const CONFIRM_COPY: Record<string, string> = {
  valor_alto_inusual:
    'El valor que escribiste es más alto de lo habitual. Revisa que el número sea correcto antes de guardarlo.',
  valor_bajo_inusual:
    'El valor que escribiste es más bajo de lo habitual. Revisa que el número sea correcto antes de guardarlo.',
};

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'confirmar'; motivo: string }
  | { tipo: 'guardado'; alertas: RuleEvaluation[] };

export function GlucoseForm() {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<GlucoseUnit>('mg/dL');
  const [context, setContext] = useState<GlucoseContext>('fasting');
  const [measuredAt, setMeasuredAt] = useState(ahoraLocal);
  const [note, setNote] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' });
  const [pendiente, startTransition] = useTransition();

  function enviar(confirmed: boolean) {
    startTransition(async () => {
      const r = await saveGlucose({
        value: Number(value),
        unit,
        context,
        measuredAt,
        note,
        confirmed,
      });

      if (r.status === 'error') setEstado({ tipo: 'error', mensaje: r.error });
      else if (r.status === 'needs_confirmation')
        setEstado({ tipo: 'confirmar', motivo: r.reason });
      else {
        setEstado({ tipo: 'guardado', alertas: r.alerts });
        setValue('');
        setNote('');
      }
    });
  }

  // Sin utilidad de ancho: la fija cada campo, para que no choque `w-full`
  // con anchos concretos como el `w-36` del selector de unidad.
  const campo =
    'rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';
  const etiqueta = 'block text-base font-medium text-slate-800';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar(false);
      }}
      className="space-y-6"
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor="valor" className={etiqueta}>
          ¿Cuánto marcó tu medidor?
        </label>
        <div className="flex gap-3">
          <input
            id="valor"
            name="valor"
            type="number"
            inputMode="decimal"
            step="any"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="valor-ayuda"
            className={`${campo} w-full min-w-0 flex-1`}
          />
          <select
            aria-label="Unidad de medida"
            value={unit}
            onChange={(e) => setUnit(e.target.value as GlucoseUnit)}
            className={`${campo} w-36 shrink-0`}
          >
            <option value="mg/dL">mg/dL</option>
            <option value="mmol/L">mmol/L</option>
          </select>
        </div>
        <p id="valor-ayuda" className="text-base text-slate-600">
          Escribe el número tal como aparece en la pantalla de tu medidor.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className={etiqueta}>¿Cuándo te la mediste?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(GLUCOSE_CONTEXT_LABELS) as GlucoseContext[]).map((c) => (
            <label
              key={c}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-lg ${
                context === c
                  ? 'border-teal-700 bg-teal-50 font-medium text-teal-900'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="contexto"
                value={c}
                checked={context === c}
                onChange={() => setContext(c)}
                className="h-5 w-5 accent-teal-700"
              />
              {GLUCOSE_CONTEXT_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="fecha" className={etiqueta}>
          Fecha y hora
        </label>
        <input
          id="fecha"
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          className={`${campo} w-full`}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="nota" className={etiqueta}>
          Nota <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <textarea
          id="nota"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Por ejemplo: comí más tarde de lo normal"
          className={`${campo} w-full`}
        />
      </div>

      {estado.tipo === 'error' && (
        <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-900">
          {estado.mensaje}
        </p>
      )}

      {/* CA-04 — confirmación explícita de un valor inusual. */}
      {estado.tipo === 'confirmar' && (
        <div
          role="alertdialog"
          aria-labelledby="confirmar-titulo"
          className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4"
        >
          <h2 id="confirmar-titulo" className="text-lg font-semibold text-amber-950">
            Confirma el valor
          </h2>
          <p className="mt-2 text-lg leading-relaxed text-amber-950">
            {CONFIRM_COPY[estado.motivo] ?? 'Revisa que el número sea correcto.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => enviar(true)}
              disabled={pendiente}
              className="rounded-lg bg-amber-700 px-5 py-3 text-lg font-medium text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:opacity-60"
            >
              Sí, el valor es correcto
            </button>
            <button
              type="button"
              onClick={() => setEstado({ tipo: 'inicial' })}
              className="rounded-lg border-2 border-amber-700 px-5 py-3 text-lg font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
            >
              Voy a corregirlo
            </button>
          </div>
        </div>
      )}

      {estado.tipo === 'guardado' && (
        <div className="space-y-3">
          <p
            role="status"
            className="rounded-lg border-2 border-teal-300 bg-teal-50 px-4 py-3 text-lg text-teal-900"
          >
            Listo, guardamos tu registro.
          </p>

          {/* RB-10 — cada mensaje declara su nivel. El texto viene de la regla aprobada. */}
          {estado.alertas.map((a) => (
            <div
              key={a.ruleId}
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
      )}

      <button
        type="submit"
        disabled={pendiente || value === ''}
        className="w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? 'Guardando…' : 'Guardar registro'}
      </button>
    </form>
  );
}

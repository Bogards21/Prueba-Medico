'use client';

import { useState, useTransition } from 'react';
import { saveWeight } from '@/app/actions/measurements';
import type { WeightUnit } from '@/domain/weight';
import type { RuleEvaluation } from '@/domain/rules/types';
import { campo, etiqueta, botonGuardar, ahoraLocal, ErrorMensaje, Guardado } from '../ui';

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'guardado'; alertas: RuleEvaluation[] };

export function PesoForm() {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [measuredAt, setMeasuredAt] = useState(ahoraLocal);
  const [note, setNote] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' });
  const [pendiente, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveWeight({ value: Number(value), unit, measuredAt, note });
      if (r.status === 'error') setEstado({ tipo: 'error', mensaje: r.error });
      else if (r.status === 'saved') {
        setEstado({ tipo: 'guardado', alertas: r.alerts });
        setValue('');
        setNote('');
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="valor" className={etiqueta}>
          ¿Cuánto marcó la báscula?
        </label>
        <div className="flex gap-3">
          <input
            id="valor"
            type="number"
            inputMode="decimal"
            step="any"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${campo} w-full min-w-0 flex-1`}
          />
          <select
            aria-label="Unidad de peso"
            value={unit}
            onChange={(e) => setUnit(e.target.value as WeightUnit)}
            className={`${campo} w-32 shrink-0`}
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>
      </div>

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
          className={`${campo} w-full`}
        />
      </div>

      {estado.tipo === 'error' && <ErrorMensaje>{estado.mensaje}</ErrorMensaje>}
      {estado.tipo === 'guardado' && <Guardado alertas={estado.alertas} />}

      <button type="submit" disabled={pendiente || value === ''} className={botonGuardar}>
        {pendiente ? 'Guardando…' : 'Guardar registro'}
      </button>
    </form>
  );
}

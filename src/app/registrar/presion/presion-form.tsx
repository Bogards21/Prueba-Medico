'use client';

import { useState, useTransition } from 'react';
import { saveBloodPressure } from '@/app/actions/measurements';
import type { RuleEvaluation } from '@/domain/rules/types';
import {
  campo,
  etiqueta,
  botonGuardar,
  ahoraLocal,
  ErrorMensaje,
  Confirmacion,
  Guardado,
} from '../ui';

const CONFIRM_COPY: Record<string, string> = {
  presion_alta_inusual:
    'Las cifras que escribiste son más altas de lo habitual. Revisa que los números sean correctos antes de guardarlos.',
  presion_baja_inusual:
    'Las cifras que escribiste son más bajas de lo habitual. Revisa que los números sean correctos antes de guardarlos.',
};

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'confirmar'; motivo: string }
  | { tipo: 'guardado'; alertas: RuleEvaluation[] };

export function PresionForm() {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [measuredAt, setMeasuredAt] = useState(ahoraLocal);
  const [note, setNote] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' });
  const [pendiente, startTransition] = useTransition();

  function enviar(confirmed: boolean) {
    startTransition(async () => {
      const r = await saveBloodPressure({
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse ? Number(pulse) : undefined,
        measuredAt,
        note,
        confirmed,
      });

      if (r.status === 'error') setEstado({ tipo: 'error', mensaje: r.error });
      else if (r.status === 'needs_confirmation')
        setEstado({ tipo: 'confirmar', motivo: r.reason });
      else {
        setEstado({ tipo: 'guardado', alertas: r.alerts });
        setSystolic('');
        setDiastolic('');
        setPulse('');
        setNote('');
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar(false);
      }}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="systolic" className={etiqueta}>
            Cifra alta (sistólica)
          </label>
          <input
            id="systolic"
            type="number"
            inputMode="numeric"
            required
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            aria-describedby="systolic-ayuda"
            className={`${campo} w-full`}
          />
          <p id="systolic-ayuda" className="text-base text-slate-600">
            El número mayor de los dos.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="diastolic" className={etiqueta}>
            Cifra baja (diastólica)
          </label>
          <input
            id="diastolic"
            type="number"
            inputMode="numeric"
            required
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            aria-describedby="diastolic-ayuda"
            className={`${campo} w-full`}
          />
          <p id="diastolic-ayuda" className="text-base text-slate-600">
            El número menor de los dos.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="pulse" className={etiqueta}>
          Pulso <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <input
          id="pulse"
          type="number"
          inputMode="numeric"
          value={pulse}
          onChange={(e) => setPulse(e.target.value)}
          className={`${campo} w-full`}
        />
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

      {estado.tipo === 'confirmar' && (
        <Confirmacion
          mensaje={CONFIRM_COPY[estado.motivo] ?? 'Revisa que los números sean correctos.'}
          onConfirmar={() => enviar(true)}
          onCorregir={() => setEstado({ tipo: 'inicial' })}
          pendiente={pendiente}
        />
      )}

      {estado.tipo === 'guardado' && <Guardado alertas={estado.alertas} />}

      <button
        type="submit"
        disabled={pendiente || systolic === '' || diastolic === ''}
        className={botonGuardar}
      >
        {pendiente ? 'Guardando…' : 'Guardar registro'}
      </button>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMedication } from '@/app/actions/medications';
import { DAY_KEYS, DAY_LABELS } from '@/domain/medication';
import type { DayKey } from '@/domain/medication';

const campo =
  'rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';
const etiqueta = 'block text-base font-medium text-slate-800';

const hoyIso = () => new Date().toISOString().slice(0, 10);

export function MedicamentoForm() {
  const [name, setName] = useState('');
  const [presentation, setPresentation] = useState('');
  const [doseText, setDoseText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [todosLosDias, setTodosLosDias] = useState(true);
  const [dias, setDias] = useState<Set<DayKey>>(new Set());
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [startDate, setStartDate] = useState(hoyIso);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const alternarDia = (d: DayKey) =>
    setDias((prev) => {
      const s = new Set(prev);
      s.has(d) ? s.delete(d) : s.add(d);
      return s;
    });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const r = await createMedication({
        name,
        presentation,
        doseText,
        instructions,
        dayPattern: todosLosDias ? ['daily'] : [...dias],
        times: times.filter(Boolean),
        startDate,
        endDate: endDate || undefined,
      });

      if (!r.ok) setError(r.error);
      else {
        router.push('/medicamentos');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="name" className={etiqueta}>
          ¿Cómo se llama el medicamento?
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${campo} w-full`}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="presentation" className={etiqueta}>
          Presentación <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <input
          id="presentation"
          placeholder="Por ejemplo: tabletas de 850 mg"
          value={presentation}
          onChange={(e) => setPresentation(e.target.value)}
          className={`${campo} w-full`}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="doseText" className={etiqueta}>
          ¿Cuánto tomas cada vez? <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <input
          id="doseText"
          placeholder="Por ejemplo: 1 tableta"
          value={doseText}
          onChange={(e) => setDoseText(e.target.value)}
          aria-describedby="dose-ayuda"
          className={`${campo} w-full`}
        />
        {/* §RF-08 Restricciones — la plataforma no sugiere ni ajusta dosis. */}
        <p id="dose-ayuda" className="text-base leading-relaxed text-slate-600">
          Escribe lo que te indicó tu profesional de salud. Esta plataforma no indica ni
          modifica dosis.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className={etiqueta}>¿Qué días lo tomas?</legend>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg">
          <input
            type="checkbox"
            checked={todosLosDias}
            onChange={(e) => setTodosLosDias(e.target.checked)}
            className="h-5 w-5 accent-teal-700"
          />
          Todos los días
        </label>

        {!todosLosDias && (
          <div className="grid gap-2 sm:grid-cols-2">
            {DAY_KEYS.map((d) => (
              <label
                key={d}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-lg ${
                  dias.has(d)
                    ? 'border-teal-700 bg-teal-50 font-medium text-teal-900'
                    : 'border-slate-300 bg-white text-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dias.has(d)}
                  onChange={() => alternarDia(d)}
                  className="h-5 w-5 accent-teal-700"
                />
                {DAY_LABELS[d]}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={etiqueta}>¿A qué horas?</legend>
        {times.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="time"
              aria-label={`Horario ${i + 1}`}
              value={t}
              onChange={(e) =>
                setTimes((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
              }
              className={`${campo} flex-1`}
            />
            {times.length > 1 && (
              <button
                type="button"
                onClick={() => setTimes((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-lg border-2 border-slate-300 px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTimes((prev) => [...prev, '20:00'])}
          className="rounded-lg border-2 border-teal-700 px-4 py-3 text-base font-medium text-teal-800 hover:bg-teal-50"
        >
          Añadir otro horario
        </button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="startDate" className={etiqueta}>
            Desde
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`${campo} w-full`}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="endDate" className={etiqueta}>
            Hasta <span className="font-normal text-slate-600">(opcional)</span>
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`${campo} w-full`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="instructions" className={etiqueta}>
          Indicaciones <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <textarea
          id="instructions"
          rows={2}
          placeholder="Por ejemplo: con alimentos"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className={`${campo} w-full`}
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
        {pendiente ? 'Guardando…' : 'Guardar medicamento'}
      </button>
    </form>
  );
}

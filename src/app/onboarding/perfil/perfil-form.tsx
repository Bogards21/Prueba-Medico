'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/app/actions/profile';
import type { PerfilActual } from '@/app/actions/profile';
import type { GlucoseUnit } from '@/domain/glucose';

const campo =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';
const etiqueta = 'block text-base font-medium text-slate-800';

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export function PerfilForm({
  inicial,
  destino,
}: {
  inicial: PerfilActual | null;
  destino: string;
}) {
  const [firstName, setFirstName] = useState(inicial?.firstName ?? '');
  const [lastName, setLastName] = useState(inicial?.lastName ?? '');
  const [birthDate, setBirthDate] = useState(iso(inicial?.birthDate ?? null));
  const [diagnosisYear, setDiagnosisYear] = useState(
    inicial?.diagnosisYear ? String(inicial.diagnosisYear) : '',
  );
  const [heightCm, setHeightCm] = useState(inicial?.heightCm ? String(inicial.heightCm) : '');
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(inicial?.glucoseUnit ?? 'mg/dL');
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    startTransition(async () => {
      const r = await saveProfile({
        firstName,
        lastName: lastName || undefined,
        birthDate,
        diagnosisYear: diagnosisYear ? Number(diagnosisYear) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        glucoseUnit,
        // §13.4 — la zona horaria del navegador; de ella dependen los recordatorios.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
      });

      if (!r.ok) setError(r.error);
      else if (destino) {
        router.push(destino);
        router.refresh();
      } else {
        setGuardado(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="firstName" className={etiqueta}>
          ¿Cómo te llamas?
        </label>
        <input
          id="firstName"
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={campo}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="lastName" className={etiqueta}>
          Apellidos <span className="font-normal text-slate-600">(opcional)</span>
        </label>
        <input
          id="lastName"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={campo}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="birthDate" className={etiqueta}>
          Fecha de nacimiento
        </label>
        <input
          id="birthDate"
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className={campo}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className={etiqueta}>¿En qué unidad mides tu glucosa?</legend>
        <p className="text-base text-slate-600">
          Es la unidad que aparece en tu medidor. En México suele ser mg/dL.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['mg/dL', 'mmol/L'] as GlucoseUnit[]).map((u) => (
            <label
              key={u}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-lg ${
                glucoseUnit === u
                  ? 'border-teal-700 bg-teal-50 font-medium text-teal-900'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="glucoseUnit"
                value={u}
                checked={glucoseUnit === u}
                onChange={() => setGlucoseUnit(u)}
                className="h-5 w-5 accent-teal-700"
              />
              {u}
            </label>
          ))}
        </div>
      </fieldset>

      {/* RF-03: "solo se solicitarán datos necesarios" — el resto va aparte y es opcional. */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-2 text-base font-medium text-slate-800">
          Opcional, ayuda a personalizar tu seguimiento
        </legend>

        <div className="space-y-2">
          <label htmlFor="diagnosisYear" className={etiqueta}>
            ¿En qué año te diagnosticaron diabetes?
          </label>
          <input
            id="diagnosisYear"
            type="number"
            inputMode="numeric"
            placeholder="Por ejemplo: 2014"
            value={diagnosisYear}
            onChange={(e) => setDiagnosisYear(e.target.value)}
            className={campo}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="heightCm" className={etiqueta}>
            Tu estatura en centímetros
          </label>
          <input
            id="heightCm"
            type="number"
            inputMode="numeric"
            placeholder="Por ejemplo: 172"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className={campo}
          />
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg leading-relaxed text-red-900"
        >
          {error}
        </p>
      )}

      {guardado && (
        <p
          role="status"
          className="rounded-lg border-2 border-teal-300 bg-teal-50 px-4 py-3 text-lg text-teal-900"
        >
          Guardamos tus cambios.
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? 'Guardando…' : destino ? 'Continuar' : 'Guardar cambios'}
      </button>
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RangoFechas({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter();
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);

  const invertido = d > h;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (invertido) return;
        router.push(`/admin/reportes?desde=${d}&hasta=${h}`);
      }}
      className="tarjeta p-5"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="desde" className="etiqueta">
            Desde
          </label>
          <input
            id="desde"
            type="date"
            value={d}
            onChange={(e) => setD(e.target.value)}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="hasta" className="etiqueta">
            Hasta
          </label>
          <input
            id="hasta"
            type="date"
            value={h}
            onChange={(e) => setH(e.target.value)}
            aria-invalid={invertido}
            className="campo"
          />
        </div>
        <button type="submit" disabled={invertido} className="btn-primario">
          Aplicar
        </button>
      </div>
      {invertido && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          La fecha inicial es posterior a la final.
        </p>
      )}
    </form>
  );
}

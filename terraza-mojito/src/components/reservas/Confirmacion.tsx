'use client';

import Link from 'next/link';
import { Check, TriangleAlert } from 'lucide-react';
import { formatoAmPm } from '@/lib/horarios';

/**
 * Pantalla de solicitud enviada.
 *
 * PRD RN-01 y §17: nunca decir "reserva confirmada" aquí. La solicitud queda
 * pendiente hasta que el negocio la apruebe, y el texto debe dejarlo claro
 * para no generar una expectativa falsa.
 */
export function Confirmacion({
  reservaId,
  borrador,
  modoDemo,
}: {
  reservaId: string;
  borrador: {
    reservation_date: string | null;
    reservation_time: string | null;
    party_size: number;
    first_name: string;
  };
  modoDemo: boolean;
}) {
  const fecha = borrador.reservation_date
    ? new Date(`${borrador.reservation_date}T12:00:00`).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <div className="mx-auto w-full max-w-xl text-center">
      <div
        aria-hidden
        className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-menta"
      >
        <Check size={40} className="text-noche" strokeWidth={2.5} />
      </div>

      <h1 className="display text-4xl">Solicitud enviada</h1>
      <p className="mt-4 text-lg text-carbon/80">
        Gracias, {borrador.first_name}. Todavía no es una reserva confirmada: la
        revisamos y te avisamos en cuanto quede lista.
      </p>

      <dl className="tarjeta mt-8 divide-y divide-borde text-left">
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="dato text-sm uppercase text-carbon/60">Fecha</dt>
          <dd className="font-semibold text-noche first-letter:uppercase">{fecha}</dd>
        </div>
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="dato text-sm uppercase text-carbon/60">Hora</dt>
          <dd className="font-semibold text-noche">
            {borrador.reservation_time && formatoAmPm(borrador.reservation_time)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="dato text-sm uppercase text-carbon/60">Personas</dt>
          <dd className="font-semibold text-noche">{borrador.party_size}</dd>
        </div>
        <div className="flex justify-between gap-4 px-6 py-4">
          <dt className="dato text-sm uppercase text-carbon/60">Folio</dt>
          <dd className="font-mono text-sm text-noche">{reservaId.slice(0, 8).toUpperCase()}</dd>
        </div>
      </dl>

      {modoDemo && (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-md border-2 border-amber-400 bg-amber-50 p-4 text-left text-amber-900"
        >
          <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            <strong>Demostración:</strong> todavía no hay base de datos conectada, así
            que esta solicitud no se guardó de forma permanente. Al conectar Supabase,
            cada solicitud llega al panel del negocio y queda registrada.
          </p>
        </div>
      )}

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primario">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

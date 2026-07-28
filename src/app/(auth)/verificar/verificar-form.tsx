'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { verifyEmail } from '@/app/actions/auth';
import { botonPrincipal, ErrorMensaje } from '../ui';

export function VerificarForm({ token }: { token: string }) {
  const [estado, setEstado] = useState<'inicial' | 'ok' | { error: string }>('inicial');
  const [pendiente, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      const r = await verifyEmail(token);
      setEstado(r.ok ? 'ok' : { error: r.error });
    });
  }

  if (estado === 'ok') {
    return (
      <div className="space-y-6">
        <p role="status" className="text-lg leading-relaxed text-slate-700">
          Tu correo quedó confirmado. Ya puedes continuar con la configuración de tu cuenta.
        </p>
        <Link
          href="/onboarding/consentimientos"
          className="block rounded-lg bg-teal-800 px-6 py-4 text-center text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          Continuar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-lg leading-relaxed text-slate-700">
        Pulsa el botón para confirmar que este correo es tuyo.
      </p>

      {typeof estado === 'object' && <ErrorMensaje>{estado.error}</ErrorMensaje>}

      <button type="button" onClick={confirmar} disabled={pendiente} className={botonPrincipal}>
        {pendiente ? 'Confirmando…' : 'Confirmar mi correo'}
      </button>
    </div>
  );
}

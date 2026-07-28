'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/app/actions/auth';
import { campo, etiqueta, botonPrincipal, ErrorMensaje } from '../ui';

export function RegistroForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await register(email, password);
      if (!r.ok) setError(r.error);
      else if (r.verificationUrl) setVerificacion(r.verificationUrl);
      else router.push('/onboarding/consentimientos');
    });
  }

  if (verificacion) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-lg border-2 border-teal-300 bg-teal-50 px-4 py-3 text-lg leading-relaxed text-teal-900"
        >
          Creamos tu cuenta. Te enviamos un correo para confirmarla.
        </p>
        {/* Solo en desarrollo: sin servicio de correo contratado (§27). */}
        <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3">
          <p className="text-base font-semibold text-amber-950">Modo de desarrollo</p>
          <p className="mt-1 text-base leading-relaxed text-amber-950">
            Todavía no hay servicio de correo, así que este es el enlace que se habría enviado:
          </p>
          <Link
            href={verificacion}
            className="mt-2 inline-block text-lg font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
          >
            Confirmar mi correo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className={etiqueta}>
          Tu correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={campo}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className={etiqueta}>
          Crea una contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-ayuda"
          className={campo}
        />
        <p id="password-ayuda" className="text-base leading-relaxed text-slate-600">
          Al menos 10 caracteres. Una frase que recuerdes, como “el perro come croquetas”,
          funciona muy bien.
        </p>
      </div>

      {error && <ErrorMensaje>{error}</ErrorMensaje>}

      <button type="submit" disabled={pendiente} className={botonPrincipal}>
        {pendiente ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
      </button>

      <p className="text-center text-base text-slate-700">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/entrar"
          className="font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

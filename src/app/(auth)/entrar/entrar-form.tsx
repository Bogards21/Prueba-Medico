'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/auth';
import { campo, etiqueta, botonPrincipal, ErrorMensaje } from '../ui';

export function EntrarForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await login(email, password);
      if (!r.ok) setError(r.error);
      else {
        router.push('/');
        router.refresh();
      }
    });
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
          Tu contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={campo}
        />
      </div>

      {error && <ErrorMensaje>{error}</ErrorMensaje>}

      <button type="submit" disabled={pendiente} className={botonPrincipal}>
        {pendiente ? 'Entrando…' : 'Entrar'}
      </button>

      <p className="text-center text-base text-slate-700">
        ¿Todavía no tienes cuenta?{' '}
        <Link
          href="/registro"
          className="font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
        >
          Crea una
        </Link>
      </p>
    </form>
  );
}

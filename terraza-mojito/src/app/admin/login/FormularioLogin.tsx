'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { accionIniciarSesion } from '../acciones';

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primario mt-6 w-full">
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

export function FormularioLogin() {
  const [estado, accion] = useActionState(accionIniciarSesion, null);

  return (
    <form action={accion}>
      {estado?.error && (
        <p role="alert" className="mb-5 rounded-sm border-2 border-red-300 bg-red-50 p-3 text-red-900">
          {estado.error}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="usuario" className="etiqueta">
            Usuario
          </label>
          <input
            id="usuario"
            name="usuario"
            autoComplete="username"
            required
            // `key` fuerza a React a recrear el input tras un intento fallido,
            // de modo que el defaultValue vuelva a aplicarse y el usuario no
            // tenga que reescribir su nombre.
            key={estado?.usuario ?? ''}
            defaultValue={estado?.usuario ?? ''}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor="contrasena" className="etiqueta">
            Contraseña
          </label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            required
            className="campo"
          />
        </div>
      </div>

      <Boton />
    </form>
  );
}

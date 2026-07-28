'use client';

/** Piezas compartidas por las pantallas de acceso. §17.6 y §18.2. */

export const campo =
  'w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 focus:border-teal-700 focus:outline-2 focus:outline-offset-1 focus:outline-teal-700';

export const etiqueta = 'block text-base font-medium text-slate-800';

export const botonPrincipal =
  'w-full rounded-lg bg-teal-800 px-6 py-4 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 disabled:cursor-not-allowed disabled:opacity-50';

export function ErrorMensaje({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg leading-relaxed text-red-900"
    >
      {children}
    </p>
  );
}

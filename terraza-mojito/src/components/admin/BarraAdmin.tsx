'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { accionCerrarSesion } from '@/app/admin/acciones';
import type { Sesion } from '@/lib/auth';

const ENLACES = [
  { href: '/admin', texto: 'Hoy', exacto: true },
  { href: '/admin/reservas', texto: 'Reservas', exacto: false },
  { href: '/admin/clientes', texto: 'Clientes', exacto: false },
  { href: '/admin/reportes', texto: 'Reportes', exacto: false, soloAdmin: true },
];

export function BarraAdmin({ sesion }: { sesion: Sesion }) {
  const ruta = usePathname();

  const visibles = ENLACES.filter((e) => !e.soloAdmin || sesion.rol === 'admin');

  return (
    <header className="border-b border-borde bg-espuma">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/admin" aria-label="Panel, inicio">
          <Logo tamano="sm" />
        </Link>

        <nav aria-label="Panel" className="order-3 w-full sm:order-2 sm:w-auto">
          <ul className="flex gap-1 overflow-x-auto">
            {visibles.map((e) => {
              const activo = e.exacto ? ruta === e.href : ruta.startsWith(e.href);
              return (
                <li key={e.href}>
                  <Link
                    href={e.href}
                    aria-current={activo ? 'page' : undefined}
                    className={`dato inline-block whitespace-nowrap rounded-pill px-4 py-2 text-sm transition-colors ${
                      activo ? 'bg-noche text-espuma' : 'text-noche hover:bg-lima-pale'
                    }`}
                  >
                    {e.texto}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="order-2 flex items-center gap-3 sm:order-3">
          <p className="text-sm text-carbon/70">
            {sesion.usuario}
            <span className="ml-2 rounded-pill bg-lima-pale px-2 py-0.5 text-xs uppercase text-noche">
              {sesion.rol}
            </span>
          </p>
          <form action={accionCerrarSesion}>
            <button type="submit" className="btn-fantasma text-sm">
              <LogOut aria-hidden size={16} />
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

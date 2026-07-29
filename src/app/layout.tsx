import type { Metadata } from 'next';
import Link from 'next/link';
import { getActor } from '@/lib/roles';
import { logout } from './actions/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acompañamiento en diabetes tipo 2',
  description:
    'Registra tu glucosa, peso, presión y medicamentos, observa tus tendencias y prepara tu próxima consulta.',
};

/**
 * §18.3 — navegación principal del PRD. Solo las rutas ya implementadas;
 * falta Tendencias.
 */
const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/registrar', label: 'Registrar' },
  { href: '/medicamentos', label: 'Medicamentos' },
  { href: '/aprender', label: 'Aprender' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/perfil', label: 'Perfil' },
];

const NAV_INVITADO = [
  { href: '/entrar', label: 'Entrar' },
  { href: '/registro', label: 'Crear cuenta' },
];

/** Enlaces internos. Se ocultan por comodidad; cada pantalla revalida el rol. */
const NAV_CONTENIDO = { href: '/admin/contenido', label: 'Contenido' };
const NAV_REGLAS = { href: '/admin/reglas', label: 'Reglas' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  const conSesion = actor !== null;

  const enlaces = conSesion ? [...NAV] : NAV_INVITADO;
  if (actor && ['admin', 'editor', 'clinical_reviewer'].includes(actor.role)) {
    enlaces.push(NAV_CONTENIDO);
  }
  if (actor?.role === 'clinical_reviewer') {
    enlaces.push(NAV_REGLAS);
  }

  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {/* §17.6 — navegación por teclado */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-base focus:font-medium focus:shadow-lg focus:outline-2 focus:outline-teal-700"
        >
          Saltar al contenido
        </a>

        <header className="border-b border-slate-200 bg-white">
          <nav
            aria-label="Navegación principal"
            className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3"
          >
            {enlaces.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                {item.label}
              </Link>
            ))}

            {conSesion && (
              <form action={logout} className="ml-auto">
                <button
                  type="submit"
                  className="rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  Salir
                </button>
              </form>
            )}
          </nav>
        </header>

        <main id="contenido" className="mx-auto max-w-3xl px-4 py-8">
          {children}
        </main>

        {/* RB-01 y §33 — el límite clínico va visible en toda la aplicación. */}
        <footer className="mx-auto max-w-3xl px-4 pb-12 pt-4">
          <p className="border-t border-slate-200 pt-6 text-base leading-relaxed text-slate-600">
            Esta plataforma te ayuda a organizar y dar seguimiento a tu información de
            salud.{' '}
            <strong className="font-semibold text-slate-800">
              No sustituye una consulta, un diagnóstico ni un tratamiento médico.
            </strong>{' '}
            Ante una urgencia, comunícate con los servicios de emergencia.
          </p>
        </footer>
      </body>
    </html>
  );
}

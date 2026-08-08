'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const ENLACES = [
  { href: '#experiencia', texto: 'Experiencia' },
  { href: '#menu', texto: 'Menú' },
  { href: '#galeria', texto: 'Galería' },
  { href: '#ubicacion', texto: 'Ubicación' },
];

export function Header() {
  const [abierto, setAbierto] = useState(false);
  const [pegado, setPegado] = useState(false);

  useEffect(() => {
    const alScroll = () => setPegado(window.scrollY > 12);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  // Cierra el menú móvil al pasar a desktop para no dejarlo abierto e invisible.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const alCambiar = () => mq.matches && setAbierto(false);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [abierto]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        pegado ? 'bg-espuma/95 shadow-studio backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="marco flex h-20 items-center justify-between gap-4">
        <Link href="/" aria-label="Terraza Mojito, inicio">
          <Logo tamano="sm" />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <a href={e.href} className="btn-fantasma text-[15px]">
                  {e.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/reservar" className="btn-primario hidden text-sm sm:inline-flex">
            Reserva tu mesa
          </Link>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            className="btn-fantasma lg:hidden"
          >
            {abierto ? <X aria-hidden size={22} /> : <Menu aria-hidden size={22} />}
            <span className="sr-only">{abierto ? 'Cerrar menú' : 'Abrir menú'}</span>
          </button>
        </div>
      </div>

      {abierto && (
        <div id="menu-movil" className="border-t border-borde bg-espuma lg:hidden">
          <nav aria-label="Principal móvil" className="marco py-4">
            <ul className="flex flex-col gap-1">
              {ENLACES.map((e) => (
                <li key={e.href}>
                  <a
                    href={e.href}
                    onClick={() => setAbierto(false)}
                    className="block rounded-sm px-4 py-3 text-lg font-semibold text-noche hover:bg-lima-pale"
                  >
                    {e.texto}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href="/reservar"
                  onClick={() => setAbierto(false)}
                  className="btn-primario w-full"
                >
                  Reserva tu mesa
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

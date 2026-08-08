'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * CTA persistente en móvil (PRD §8.1).
 * Aparece al pasar el hero para no competir con el CTA principal.
 */
export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-espuma/95 p-3 backdrop-blur transition-transform duration-300 sm:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      // Fuera de pantalla no debe ser alcanzable por teclado.
      aria-hidden={!visible}
    >
      <Link
        href="/reservar"
        tabIndex={visible ? undefined : -1}
        className="btn-primario w-full"
      >
        Reserva tu mesa
      </Link>
    </div>
  );
}

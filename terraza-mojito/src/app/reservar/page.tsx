import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Wizard } from '@/components/reservas/Wizard';

export const metadata: Metadata = {
  title: 'Reserva tu mesa',
  description: 'Solicita tu mesa en Terraza Mojito, Metepec.',
  robots: { index: false, follow: true },
};

export default function Reservar() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-borde">
        <div className="marco flex h-20 items-center">
          <Link href="/" aria-label="Terraza Mojito, inicio">
            <Logo tamano="sm" />
          </Link>
        </div>
      </header>

      <main id="contenido" className="marco flex-1 py-12 sm:py-16">
        <Wizard />
      </main>

      <footer className="border-t border-borde py-6">
        <div className="marco text-center text-sm text-carbon/60">
          <Link href="/privacidad" className="underline decoration-mojito underline-offset-4">
            Aviso de privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}

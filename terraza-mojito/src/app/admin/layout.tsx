import type { Metadata } from 'next';
import { sesionActual } from '@/lib/auth';
import { modoDemo } from '@/lib/repo';
import { BarraAdmin } from '@/components/admin/BarraAdmin';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel Terraza Mojito' },
  robots: { index: false, follow: false },
};

/**
 * El layout no redirige: envuelve también a /admin/login, y redirigir aquí
 * causaría un bucle. Cada página protegida llama a `exigirSesion()` por su
 * cuenta, que es además donde debe estar la comprobación (PRD §46).
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();

  if (!sesion) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col bg-lima-pale/20">
      <BarraAdmin sesion={sesion} />
      {modoDemo && (
        <p className="bg-amber-100 px-5 py-2 text-center text-sm text-amber-900">
          <strong>Modo demo:</strong> sin base de datos conectada. Los datos viven en
          memoria y se pierden al reiniciar el servidor.
        </p>
      )}
      <main id="contenido" className="flex-1 px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { permiteAccesoDeDesarrollo, authConfigurada, sesionActual } from '@/lib/auth';
import { Logo } from '@/components/ui/Logo';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = {
  title: 'Acceso al panel',
  robots: { index: false, follow: false },
};

export default async function Login() {
  if (await sesionActual()) redirect('/admin');

  const sinConfigurar = !authConfigurada() && !permiteAccesoDeDesarrollo();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-lima-pale/30 px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo tamano="md" />
        </div>

        <div className="tarjeta p-7">
          <h1 className="display mb-1 text-2xl">Panel del negocio</h1>
          <p className="mb-6 text-carbon/70">Acceso solo para el equipo.</p>

          {sinConfigurar ? (
            <div role="alert" className="rounded-md border-2 border-amber-400 bg-amber-50 p-4 text-amber-900">
              <p className="font-bold">Acceso no configurado</p>
              <p className="mt-1 text-sm">
                Define <code className="font-mono">AUTH_SECRET</code> y{' '}
                <code className="font-mono">ADMIN_PASSWORD</code> en las variables de
                entorno del despliegue para habilitar el panel.
              </p>
            </div>
          ) : (
            <FormularioLogin />
          )}

          {permiteAccesoDeDesarrollo() && (
            <p className="mt-5 rounded-sm bg-lima-pale/60 p-3 text-sm text-carbon/80">
              Modo desarrollo sin credenciales configuradas: entra con{' '}
              <strong>admin</strong> / <strong>demo</strong>. Este acceso queda
              deshabilitado automáticamente en producción.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

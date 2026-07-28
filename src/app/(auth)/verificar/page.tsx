import Link from 'next/link';
import { VerificarForm } from './verificar-form';

export const metadata = { title: 'Confirmar correo' };
export const dynamic = 'force-dynamic';

/**
 * La confirmación NO ocurre al renderizar. Un GET no debe cambiar estado: los
 * escáneres de correo y los prefetch abren los enlaces solos, y Next tampoco
 * permite revalidar durante el render. Por eso la página solo muestra el
 * botón, y la mutación va en una acción de servidor.
 */
export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Confirma tu correo</h1>

      {token ? (
        <VerificarForm token={token} />
      ) : (
        <>
          <p
            role="alert"
            className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg leading-relaxed text-red-900"
          >
            Falta el código de confirmación. Abre el enlace completo que te enviamos.
          </p>
          <Link
            href="/entrar"
            className="font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900"
          >
            Volver a iniciar sesión
          </Link>
        </>
      )}
    </div>
  );
}

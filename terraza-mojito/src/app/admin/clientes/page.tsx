import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sesionActual } from '@/lib/auth';
import { listarClientes } from '@/lib/repo';
import { BuscadorClientes } from '@/components/admin/BuscadorClientes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Clientes' };

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');

  const { q } = await searchParams;
  const clientes = await listarClientes(q);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="display mb-6 text-3xl">Clientes</h1>

      <BuscadorClientes valorInicial={q ?? ''} />

      <p aria-live="polite" className="mb-4 mt-6 text-sm text-carbon/70">
        {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
      </p>

      {clientes.length === 0 ? (
        <div className="tarjeta p-10 text-center">
          <p className="text-lg font-bold text-noche">
            {q ? 'Ningún cliente coincide' : 'Todavía no hay clientes'}
          </p>
          <p className="mt-1 text-carbon/70">
            {q
              ? 'Prueba con otro nombre, teléfono o correo.'
              : 'Se crean solos con la primera reserva de cada persona.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <li key={c.cliente.id}>
              <Link
                href={`/admin/clientes/${c.cliente.id}`}
                className="tarjeta block h-full p-5 transition-shadow hover:shadow-card"
              >
                <p className="text-lg font-bold text-noche">
                  {c.cliente.first_name} {c.cliente.last_name}
                </p>
                <p className="mt-1 text-sm text-carbon/70">{c.cliente.phone}</p>
                <p className="break-all text-sm text-carbon/70">{c.cliente.email}</p>

                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-borde pt-3 text-sm">
                  <div className="flex gap-1.5">
                    <dt className="text-carbon/60">Reservas</dt>
                    <dd className="font-bold text-noche">{c.total}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-carbon/60">Visitas</dt>
                    <dd className="font-bold text-noche">{c.completadas}</dd>
                  </div>
                  {c.noShows > 0 && (
                    <div className="flex gap-1.5">
                      <dt className="text-carbon/60">No show</dt>
                      <dd className="font-bold text-amber-700">{c.noShows}</dd>
                    </div>
                  )}
                </dl>

                {c.proximaReserva && (
                  <p className="mt-3 rounded-sm bg-menta/40 px-3 py-1.5 text-sm text-noche">
                    Próxima:{' '}
                    {new Date(`${c.proximaReserva.reservation_date}T12:00:00`).toLocaleDateString(
                      'es-MX',
                      { day: 'numeric', month: 'short' },
                    )}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { sesionActual } from '@/lib/auth';
import { listarNotas, obtenerResumenCliente, reservasDeCliente } from '@/lib/repo';
import { formatoAmPm } from '@/lib/horarios';
import { Estado } from '@/components/admin/Estado';
import { Notas } from '@/components/admin/Notas';

export const dynamic = 'force-dynamic';

export default async function FichaCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');

  const { id } = await params;
  const resumen = await obtenerResumenCliente(id);
  if (!resumen) notFound();

  const [reservas, notas] = await Promise.all([reservasDeCliente(id), listarNotas(id)]);
  const { cliente } = resumen;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/clientes" className="btn-fantasma mb-6 -ml-4 text-sm">
        <ArrowLeft aria-hidden size={16} />
        Clientes
      </Link>

      <h1 className="display text-3xl">
        {cliente.first_name} {cliente.last_name}
      </h1>
      <p className="mt-2 text-carbon/75">
        <a href={`tel:+52${cliente.phone}`} className="underline decoration-mojito underline-offset-4">
          {cliente.phone}
        </a>
        {' · '}
        <a href={`mailto:${cliente.email}`} className="underline decoration-mojito underline-offset-4">
          {cliente.email}
        </a>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="dato rounded-pill bg-lima-pale px-3 py-1 text-xs uppercase text-noche">
          Cliente desde{' '}
          {new Date(cliente.created_at).toLocaleDateString('es-MX', {
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span
          className={`dato rounded-pill px-3 py-1 text-xs uppercase ${
            cliente.marketing_consent
              ? 'bg-menta text-noche'
              : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          {cliente.marketing_consent ? 'Acepta promociones' : 'Sin consentimiento de marketing'}
        </span>
      </div>

      {/* Métricas */}
      <dl className="mt-8 grid gap-4 sm:grid-cols-4">
        <Metrica etiqueta="Reservas" valor={resumen.total} />
        <Metrica etiqueta="Visitas" valor={resumen.completadas} />
        <Metrica etiqueta="Canceladas" valor={resumen.canceladas} />
        <Metrica etiqueta="No show" valor={resumen.noShows} alerta={resumen.noShows > 0} />
      </dl>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Historial de reservas */}
        <section>
          <h2 className="display mb-4 text-2xl">Historial de reservas</h2>
          {reservas.length === 0 ? (
            <div className="tarjeta p-6 text-carbon/70">Sin reservas registradas.</div>
          ) : (
            <ul className="tarjeta divide-y divide-borde">
              {reservas.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Link
                    href={`/admin/reservas/${r.id}`}
                    className="min-w-0 flex-1 font-semibold text-noche hover:underline"
                  >
                    {new Date(`${r.reservation_date}T12:00:00`).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {formatoAmPm(r.reservation_time)}
                  </Link>
                  <span className="text-sm text-carbon/70">{r.party_size} pers.</span>
                  <Estado estado={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notas internas (PRD RN-06) */}
        <Notas clienteId={id} notas={notas} />
      </div>
    </div>
  );
}

function Metrica({
  etiqueta,
  valor,
  alerta,
}: {
  etiqueta: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className={`tarjeta p-5 ${alerta ? 'border-amber-400 bg-amber-50' : ''}`}>
      <dt className="text-sm text-carbon/70">{etiqueta}</dt>
      <dd className={`display mt-1 text-3xl ${alerta ? 'text-amber-800' : 'text-noche'}`}>
        {valor}
      </dd>
    </div>
  );
}

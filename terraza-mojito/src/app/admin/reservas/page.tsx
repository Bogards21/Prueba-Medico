import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sesionActual } from '@/lib/auth';
import { listarReservas } from '@/lib/repo';
import { formatoAmPm } from '@/lib/horarios';
import { ESTADOS_RESERVA, ETIQUETA_ESTADO, type EstadoReserva } from '@/lib/tipos';
import { Estado } from '@/components/admin/Estado';
import { FiltrosReservas } from '@/components/admin/FiltrosReservas';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Reservas' };

function esEstado(v: string | undefined): v is EstadoReserva {
  return Boolean(v && ESTADOS_RESERVA.includes(v as EstadoReserva));
}

export default async function Reservas({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; fecha?: string; q?: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');

  const params = await searchParams;
  const estado = esEstado(params.estado) ? params.estado : 'todas';

  const reservas = await listarReservas({
    estado,
    fecha: params.fecha || undefined,
    busqueda: params.q || undefined,
  });

  const hayFiltros = Boolean(params.estado || params.fecha || params.q);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="display mb-6 text-3xl">Reservas</h1>

      <FiltrosReservas
        estado={estado}
        fecha={params.fecha ?? ''}
        busqueda={params.q ?? ''}
      />

      <p aria-live="polite" className="mb-4 mt-6 text-sm text-carbon/70">
        {reservas.length} {reservas.length === 1 ? 'reserva' : 'reservas'}
        {estado !== 'todas' && ` · ${ETIQUETA_ESTADO[estado]}`}
      </p>

      {reservas.length === 0 ? (
        <div className="tarjeta p-10 text-center">
          <p className="text-lg font-bold text-noche">
            {hayFiltros ? 'Ninguna reserva coincide' : 'Todavía no hay reservas'}
          </p>
          <p className="mt-1 text-carbon/70">
            {hayFiltros
              ? 'Ajusta los filtros para ampliar la búsqueda.'
              : 'Las solicitudes que lleguen desde el sitio aparecerán aquí.'}
          </p>
          {hayFiltros && (
            <Link href="/admin/reservas" className="btn-secundario mt-5">
              Quitar filtros
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Tabla en pantallas anchas */}
          <div className="tarjeta hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <caption className="sr-only">Listado de reservas</caption>
              <thead className="border-b border-borde bg-lima-pale/30">
                <tr className="dato text-xs uppercase text-carbon/70">
                  <th scope="col" className="px-5 py-3">Fecha y hora</th>
                  <th scope="col" className="px-5 py-3">Cliente</th>
                  <th scope="col" className="px-5 py-3">Contacto</th>
                  <th scope="col" className="px-5 py-3">Pers.</th>
                  <th scope="col" className="px-5 py-3">Estado</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {reservas.map((r) => (
                  <tr key={r.id} className="hover:bg-lima-pale/20">
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="block font-semibold text-noche">
                        {new Date(`${r.reservation_date}T12:00:00`).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-sm text-carbon/70">
                        {formatoAmPm(r.reservation_time)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/clientes/${r.customer_id}`}
                        className="font-semibold text-noche hover:underline"
                      >
                        {r.cliente.first_name} {r.cliente.last_name}
                      </Link>
                      {r.occasion && (
                        <span className="block text-sm text-carbon/60">{r.occasion}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-carbon/75">
                      <span className="block">{r.cliente.phone}</span>
                      <span className="block break-all">{r.cliente.email}</span>
                    </td>
                    <td className="px-5 py-4 font-semibold">{r.party_size}</td>
                    <td className="px-5 py-4"><Estado estado={r.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/reservas/${r.id}`}
                        className="text-sm underline decoration-mojito underline-offset-4"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas en móvil: una tabla de 6 columnas no cabe en 390px */}
          <ul className="space-y-3 md:hidden">
            {reservas.map((r) => (
              <li key={r.id} className="tarjeta p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/reservas/${r.id}`}
                    className="text-lg font-bold text-noche"
                  >
                    {r.cliente.first_name} {r.cliente.last_name}
                  </Link>
                  <Estado estado={r.status} />
                </div>
                <p className="mt-2 text-carbon/75">
                  {new Date(`${r.reservation_date}T12:00:00`).toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  · {formatoAmPm(r.reservation_time)} · {r.party_size} pers.
                </p>
                <p className="mt-1 text-sm text-carbon/60">{r.cliente.phone}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

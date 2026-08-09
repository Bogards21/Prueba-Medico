import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { sesionActual } from '@/lib/auth';
import { historialDeReserva, obtenerReserva, obtenerResumenCliente } from '@/lib/repo';
import { formatoAmPm } from '@/lib/horarios';
import { ETIQUETA_ESTADO, type EstadoReserva } from '@/lib/tipos';
import { Estado } from '@/components/admin/Estado';
import { PanelEstado } from '@/components/admin/PanelEstado';

export const dynamic = 'force-dynamic';

export default async function DetalleReserva({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');

  const { id } = await params;
  const reserva = await obtenerReserva(id);
  if (!reserva) notFound();

  const [historial, resumen] = await Promise.all([
    historialDeReserva(id),
    obtenerResumenCliente(reserva.customer_id),
  ]);

  const fechaLarga = new Date(`${reserva.reservation_date}T12:00:00`).toLocaleDateString(
    'es-MX',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/reservas" className="btn-fantasma mb-6 -ml-4 text-sm">
        <ArrowLeft aria-hidden size={16} />
        Reservas
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-3xl capitalize">
            {reserva.cliente.first_name} {reserva.cliente.last_name}
          </h1>
          <p className="mt-1 text-carbon/75 first-letter:uppercase">
            {fechaLarga} · {formatoAmPm(reserva.reservation_time)}
          </p>
        </div>
        <Estado estado={reserva.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {/* Datos de la reserva */}
          <section className="tarjeta p-6">
            <h2 className="display mb-5 text-xl">Reserva</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato termino="Personas" valor={String(reserva.party_size)} />
              <Dato termino="Ocasión" valor={reserva.occasion ?? '—'} />
              <Dato
                termino="Solicitada"
                valor={new Date(reserva.created_at).toLocaleString('es-MX', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              />
              <Dato termino="Folio" valor={reserva.id.slice(0, 8).toUpperCase()} />
            </dl>

            {reserva.special_requests && (
              <div className="mt-6 rounded-md bg-lima-pale/50 p-4">
                <h3 className="dato mb-1 text-xs uppercase text-carbon/70">
                  Peticiones especiales
                </h3>
                <p className="text-carbon/90">{reserva.special_requests}</p>
              </div>
            )}

            {reserva.rejection_reason && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
                <h3 className="dato mb-1 text-xs uppercase text-red-800">
                  Motivo del rechazo
                </h3>
                <p className="text-red-900">{reserva.rejection_reason}</p>
              </div>
            )}
          </section>

          {/* Contacto */}
          <section className="tarjeta p-6">
            <h2 className="display mb-5 text-xl">Contacto</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato
                termino="Teléfono"
                valor={reserva.cliente.phone}
                enlace={`tel:+52${reserva.cliente.phone}`}
              />
              <Dato
                termino="Correo"
                valor={reserva.cliente.email}
                enlace={`mailto:${reserva.cliente.email}`}
              />
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/52${reserva.cliente.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secundario text-sm"
              >
                Escribir por WhatsApp
              </a>
              <Link
                href={`/admin/clientes/${reserva.customer_id}`}
                className="btn-fantasma text-sm"
              >
                Ver ficha del cliente
              </Link>
            </div>
          </section>

          {/* Historial (PRD RN-07) */}
          <section className="tarjeta p-6">
            <h2 className="display mb-5 text-xl">Historial de cambios</h2>
            <ol className="space-y-4">
              {historial.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="dato text-carbon/60">
                    {new Date(h.created_at).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="text-carbon/85">
                    {h.previous_status
                      ? `${ETIQUETA_ESTADO[h.previous_status as EstadoReserva]} → ${
                          ETIQUETA_ESTADO[h.new_status as EstadoReserva]
                        }`
                      : `Creada como ${ETIQUETA_ESTADO[h.new_status as EstadoReserva]}`}
                  </span>
                  <span className="text-carbon/55">por {h.changed_by}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <PanelEstado reservaId={reserva.id} estadoActual={reserva.status} />

          {resumen && (
            <section className="tarjeta p-6">
              <h2 className="display mb-4 text-xl">Este cliente</h2>
              <dl className="space-y-3 text-sm">
                <Metrica termino="Reservas totales" valor={resumen.total} />
                <Metrica termino="Completadas" valor={resumen.completadas} />
                <Metrica termino="Canceladas" valor={resumen.canceladas} />
                <Metrica termino="No show" valor={resumen.noShows} destacar={resumen.noShows > 0} />
              </dl>
              {resumen.total === 1 && (
                <p className="mt-4 rounded-sm bg-menta/40 p-3 text-sm text-noche">
                  Primera visita.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Dato({
  termino,
  valor,
  enlace,
}: {
  termino: string;
  valor: string;
  enlace?: string;
}) {
  return (
    <div>
      <dt className="dato text-xs uppercase text-carbon/60">{termino}</dt>
      <dd className="mt-1 break-words font-semibold text-noche">
        {enlace ? (
          <a href={enlace} className="underline decoration-mojito underline-offset-4">
            {valor}
          </a>
        ) : (
          valor
        )}
      </dd>
    </div>
  );
}

function Metrica({
  termino,
  valor,
  destacar,
}: {
  termino: string;
  valor: number;
  destacar?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-carbon/70">{termino}</dt>
      <dd className={`font-bold ${destacar ? 'text-amber-700' : 'text-noche'}`}>{valor}</dd>
    </div>
  );
}

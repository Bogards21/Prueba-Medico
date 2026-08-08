import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, Clock, Users, UserPlus, CheckCheck } from 'lucide-react';
import { sesionActual } from '@/lib/auth';
import { kpisDashboard, listarReservas, proximasReservas } from '@/lib/repo';
import { formatoAmPm } from '@/lib/horarios';
import { Estado } from '@/components/admin/Estado';
import { AccionesRapidas } from '@/components/admin/AccionesRapidas';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');

  const hoy = new Date().toISOString().slice(0, 10);
  const [kpis, pendientes, proximas] = await Promise.all([
    kpisDashboard(),
    listarReservas({ estado: 'pending' }),
    proximasReservas(6),
  ]);

  const tarjetas = [
    { icono: CalendarDays, etiqueta: 'Reservas hoy', valor: kpis.reservasHoy },
    { icono: Clock, etiqueta: 'Pendientes', valor: kpis.pendientes, alerta: kpis.pendientes > 0 },
    { icono: CheckCheck, etiqueta: 'Confirmadas hoy', valor: kpis.confirmadas },
    { icono: Users, etiqueta: 'Personas esperadas', valor: kpis.personasEsperadas },
    { icono: UserPlus, etiqueta: 'Clientes nuevos (30 d)', valor: kpis.clientesNuevos },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="display mb-8 text-3xl">Hoy</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tarjetas.map(({ icono: Icono, etiqueta, valor, alerta }) => (
          <div
            key={etiqueta}
            className={`tarjeta p-5 ${alerta ? 'border-mojito bg-lima-pale/50' : ''}`}
          >
            <Icono aria-hidden size={20} className="mb-3 text-hoja" />
            <p className="display text-4xl leading-none text-noche">{valor}</p>
            <p className="mt-2 text-sm text-carbon/70">{etiqueta}</p>
          </div>
        ))}
      </div>

      {/* Cola de pendientes: es la tarea principal del negocio (PRD §26). */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="display text-2xl">Esperando respuesta</h2>
          <Link
            href="/admin/reservas?estado=pending"
            className="text-sm underline decoration-mojito underline-offset-4"
          >
            Ver todas
          </Link>
        </div>

        {pendientes.length === 0 ? (
          <div className="tarjeta p-8 text-center">
            <p className="text-lg font-bold text-noche">No hay solicitudes pendientes</p>
            <p className="mt-1 text-carbon/70">
              Cuando llegue una nueva solicitud aparecerá aquí.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendientes.map((r) => (
              <li key={r.id} className="tarjeta flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/reservas/${r.id}`}
                      className="text-lg font-bold text-noche underline decoration-transparent underline-offset-4 hover:decoration-mojito"
                    >
                      {r.cliente.first_name} {r.cliente.last_name}
                    </Link>
                    <Estado estado={r.status} />
                    {r.reservation_date === hoy && (
                      <span className="dato rounded-pill bg-noche px-2.5 py-0.5 text-xs uppercase text-espuma">
                        Hoy
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-carbon/75">
                    {new Date(`${r.reservation_date}T12:00:00`).toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {formatoAmPm(r.reservation_time)} · {r.party_size}{' '}
                    {r.party_size === 1 ? 'persona' : 'personas'}
                  </p>
                </div>
                <AccionesRapidas reservaId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Agenda próxima */}
      <section className="mt-12">
        <h2 className="display mb-4 text-2xl">Próximas</h2>
        {proximas.length === 0 ? (
          <div className="tarjeta p-8 text-center text-carbon/70">
            Todavía no hay reservas próximas.
          </div>
        ) : (
          <ul className="tarjeta divide-y divide-borde">
            {proximas.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="dato w-32 shrink-0 text-sm text-carbon/70">
                  {new Date(`${r.reservation_date}T12:00:00`).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  {formatoAmPm(r.reservation_time)}
                </span>
                <Link
                  href={`/admin/reservas/${r.id}`}
                  className="min-w-0 flex-1 font-semibold text-noche hover:underline"
                >
                  {r.cliente.first_name} {r.cliente.last_name}
                </Link>
                <span className="text-sm text-carbon/70">{r.party_size} pers.</span>
                <Estado estado={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

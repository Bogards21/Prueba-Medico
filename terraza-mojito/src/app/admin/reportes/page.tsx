import { redirect } from 'next/navigation';
import { puedeVerReportes, sesionActual } from '@/lib/auth';
import { reportes } from '@/lib/repo';
import { formatoAmPm } from '@/lib/horarios';
import { RangoFechas } from '@/components/admin/RangoFechas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reportes' };

function haceDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function Reportes({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');

  // PRD §34: Staff no ve reportes. Se valida aquí, no ocultando el enlace.
  if (!puedeVerReportes(sesion)) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="tarjeta p-10 text-center">
          <h1 className="display text-2xl">Sin acceso</h1>
          <p className="mt-2 text-carbon/75">
            Los reportes están disponibles solo para cuentas de administrador.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const desde = params.desde || haceDias(30);
  const hasta = params.hasta || new Date().toISOString().slice(0, 10);

  const r = await reportes(desde, hasta);

  const tasa = (n: number) => (r.solicitudes > 0 ? Math.round((n / r.solicitudes) * 100) : 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display mb-6 text-3xl">Reportes</h1>

      <RangoFechas desde={desde} hasta={hasta} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta etiqueta="Solicitudes" valor={r.solicitudes} />
        <Tarjeta etiqueta="Confirmadas" valor={r.confirmadas} pie={`${tasa(r.confirmadas)}% del total`} />
        <Tarjeta etiqueta="Rechazadas" valor={r.rechazadas} pie={`${tasa(r.rechazadas)}% del total`} />
        <Tarjeta etiqueta="Personas atendidas" valor={r.personas} />
        <Tarjeta etiqueta="Completadas" valor={r.completadas} />
        <Tarjeta etiqueta="Canceladas" valor={r.canceladas} />
        <Tarjeta etiqueta="No show" valor={r.noShows} alerta={r.noShows > 0} />
        <Tarjeta etiqueta="Clientes nuevos" valor={r.clientesNuevos} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Ranking
          titulo="Días con más reservas"
          filas={r.diasTop.map(([clave, n]) => [
            new Date(`${clave}T12:00:00`).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            }),
            n,
          ])}
        />
        <Ranking
          titulo="Horarios más solicitados"
          filas={r.horasTop.map(([clave, n]) => [formatoAmPm(clave), n])}
        />
      </div>

      <section className="tarjeta mt-6 p-6">
        <h2 className="display mb-4 text-xl">Recurrencia</h2>
        <dl className="flex flex-wrap gap-10">
          <div>
            <dt className="text-sm text-carbon/70">Clientes nuevos</dt>
            <dd className="display text-3xl text-noche">{r.clientesNuevos}</dd>
          </div>
          <div>
            <dt className="text-sm text-carbon/70">Clientes recurrentes</dt>
            <dd className="display text-3xl text-noche">{r.clientesRecurrentes}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  pie,
  alerta,
}: {
  etiqueta: string;
  valor: number;
  pie?: string;
  alerta?: boolean;
}) {
  return (
    <div className={`tarjeta p-5 ${alerta ? 'border-amber-400 bg-amber-50' : ''}`}>
      <p className="text-sm text-carbon/70">{etiqueta}</p>
      <p className={`display mt-1 text-4xl ${alerta ? 'text-amber-800' : 'text-noche'}`}>
        {valor}
      </p>
      {pie && <p className="mt-1 text-xs text-carbon/55">{pie}</p>}
    </div>
  );
}

function Ranking({
  titulo,
  filas,
}: {
  titulo: string;
  filas: [string, number][];
}) {
  const maximo = Math.max(1, ...filas.map(([, n]) => n));

  return (
    <section className="tarjeta p-6">
      <h2 className="display mb-4 text-xl">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-carbon/70">Sin datos en este periodo.</p>
      ) : (
        <ol className="space-y-3">
          {filas.map(([etiqueta, n]) => (
            <li key={etiqueta}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="capitalize text-carbon/85">{etiqueta}</span>
                <span className="dato text-noche">{n}</span>
              </div>
              {/* Barra decorativa: el número ya está en el texto de al lado. */}
              <div aria-hidden className="h-2 overflow-hidden rounded-pill bg-lima-pale">
                <div className="h-full bg-mojito" style={{ width: `${(n / maximo) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

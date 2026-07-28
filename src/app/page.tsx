import Link from 'next/link';
import { listGlucose } from './actions/glucose';
import { listWeight, listBloodPressure } from './actions/measurements';
import { summarize } from '@/domain/trends';
import { GLUCOSE_CONTEXT_LABELS, toMgDl } from '@/domain/glucose';
import type { GlucoseContext, GlucoseUnit } from '@/domain/glucose';
import { weightDelta } from '@/domain/weight';

export const dynamic = 'force-dynamic';

const DIAS = 7;

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** RB-09 — la ausencia de dato se muestra como ausencia, nunca como 0. */
function Cifra({ valor, sufijo }: { valor: number | null; sufijo?: string }) {
  if (valor === null) {
    return <span className="text-2xl font-medium text-slate-400">Sin datos</span>;
  }
  return (
    <span className="text-3xl font-semibold tabular-nums text-slate-900">
      {Math.round(valor)}
      {sufijo && <span className="ml-1 text-lg font-normal text-slate-600">{sufijo}</span>}
    </span>
  );
}

export default async function InicioPage() {
  const [registros, pesos, presiones] = await Promise.all([
    listGlucose(),
    listWeight(),
    listBloodPressure(),
  ]);

  const to = new Date();
  const from = new Date(to.getTime() - (DIAS - 1) * 86_400_000);

  const ultimoPeso = pesos[0] ?? null;
  const anteriorPeso = pesos[1] ?? null;
  const cambioPeso =
    ultimoPeso && anteriorPeso
      ? weightDelta(Number(ultimoPeso.value), Number(anteriorPeso.value))
      : null;
  const ultimaPresion = presiones[0] ?? null;

  const resumen = summarize(
    registros.map((r) => ({
      at: r.measuredAt,
      value: toMgDl(Number(r.value), r.unit as GlucoseUnit),
    })),
    { from, to },
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Hola</h1>
        <p className="mt-2 text-lg text-slate-600">
          Este es tu resumen de los últimos {DIAS} días.
        </p>
      </div>

      <Link
        href="/registrar"
        className="block rounded-xl bg-teal-800 px-6 py-5 text-center text-xl font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
      >
        Registrar una medición
      </Link>

      <section aria-labelledby="resumen-titulo" className="space-y-3">
        <h2 id="resumen-titulo" className="text-xl font-semibold text-slate-900">
          Tu glucosa
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { etiqueta: 'Promedio', valor: resumen.average },
            { etiqueta: 'Más baja', valor: resumen.min },
            { etiqueta: 'Más alta', valor: resumen.max },
          ].map((c) => (
            <div key={c.etiqueta} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-base text-slate-600">{c.etiqueta}</p>
              <p className="mt-1">
                <Cifra valor={c.valor} sufijo="mg/dL" />
              </p>
            </div>
          ))}
        </div>

        {/* RF-11 — se indica explícitamente cuándo no hay datos suficientes. */}
        {!resumen.hasEnoughData && (
          <p className="rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-base leading-relaxed text-slate-700">
            Todavía no hay registros suficientes para mostrar una tendencia. Con tres o
            más mediciones podremos mostrarte cómo va cambiando.
          </p>
        )}

        {resumen.daysWithoutData > 0 && resumen.count > 0 && (
          <p className="text-base text-slate-600">
            {resumen.daysWithoutData === 1
              ? 'Hay 1 día sin registro en este periodo.'
              : `Hay ${resumen.daysWithoutData} días sin registro en este periodo.`}
          </p>
        )}
      </section>

      <section aria-labelledby="otras-titulo" className="space-y-3">
        <h2 id="otras-titulo" className="text-xl font-semibold text-slate-900">
          Peso y presión
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-base text-slate-600">Último peso</p>
            {ultimoPeso ? (
              <>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                  {Number(ultimoPeso.value)}
                  <span className="ml-1 text-lg font-normal text-slate-600">{ultimoPeso.unit}</span>
                </p>
                {/* RF-05 — cambio respecto a la medición anterior; null si no hay con qué comparar. */}
                {cambioPeso !== null && (
                  <p className="mt-1 text-base text-slate-600">
                    {cambioPeso > 0 ? '+' : ''}
                    {cambioPeso.toFixed(1)} {ultimoPeso.unit} desde la anterior
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-2xl font-medium text-slate-400">Sin datos</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-base text-slate-600">Última presión</p>
            {ultimaPresion ? (
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                {ultimaPresion.systolic}/{ultimaPresion.diastolic}
                <span className="ml-1 text-lg font-normal text-slate-600">mmHg</span>
              </p>
            ) : (
              <p className="mt-1 text-2xl font-medium text-slate-400">Sin datos</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="ultimos-titulo" className="space-y-3">
        <h2 id="ultimos-titulo" className="text-xl font-semibold text-slate-900">
          Últimos registros de glucosa
        </h2>

        {registros.length === 0 ? (
          // §18.2 — estados vacíos educativos.
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-lg text-slate-700">Aún no has registrado tu glucosa.</p>
            <p className="mt-2 text-base text-slate-600">
              Tu primer registro toma menos de un minuto.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {registros.slice(0, 10).map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-4 px-4 py-4">
                <div>
                  <p className="text-xl font-semibold tabular-nums text-slate-900">
                    {Number(r.value)}{' '}
                    <span className="text-base font-normal text-slate-600">{r.unit}</span>
                  </p>
                  <p className="text-base text-slate-600">
                    {GLUCOSE_CONTEXT_LABELS[r.context as GlucoseContext]}
                    {/* RB-11 — el origen del dato se muestra al usuario. */}
                    {r.source === 'manual' && ' · Registro manual'}
                  </p>
                </div>
                <time
                  dateTime={r.measuredAt.toISOString()}
                  className="shrink-0 text-base text-slate-600"
                >
                  {fecha.format(r.measuredAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

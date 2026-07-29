import Link from 'next/link';
import { ReglaAcciones } from './regla-acciones';
import { listRules } from '@/app/actions/rules';
import { requireRole } from '@/lib/roles';
import { RULE_VARIABLES, RULE_OPERATORS } from '@/domain/rules/governance';
import { SEVERITY_LABELS } from '@/domain/rules/types';
import type { RuleStatus, Severity } from '@/domain/rules/types';

export const metadata = { title: 'Reglas clínicas' };
export const dynamic = 'force-dynamic';

const VAR = new Map<string, string>(RULE_VARIABLES.map((v) => [v.key, v.labelEs]));
const OP = new Map<string, string>(RULE_OPERATORS.map((o) => [o.key, o.labelEs]));

const ETIQUETA_ESTADO: Record<RuleStatus, string> = {
  draft: 'Borrador',
  active: 'Activa: se está evaluando',
  inactive: 'Desactivada',
};

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminReglasPage() {
  // §15 y RB-06 — reglas clínicas: solo el responsable clínico.
  await requireRole('clinical_reviewer');
  const reglas = await listRules();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Reglas clínicas
          </h1>
          <p className="mt-1 text-base leading-relaxed text-slate-600">
            Una regla solo se evalúa si está aprobada y activa. Editarla la devuelve a
            borrador.
          </p>
        </div>
        <Link
          href="/admin/reglas/nueva"
          className="rounded-lg bg-teal-800 px-5 py-3 text-lg font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
        >
          Nueva
        </Link>
      </div>

      {reglas.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg text-slate-700">No hay ninguna regla definida.</p>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Mientras no haya reglas activas, la plataforma no muestra ningún mensaje clínico
            al registrar una medición.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reglas.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xl font-semibold text-slate-900">{r.name}</p>

              <p className="mt-1 text-base text-slate-700">
                Si {VAR.get(r.variable) ?? r.variable} {OP.get(r.operator) ?? r.operator}{' '}
                <span className="font-medium tabular-nums">{Number(r.threshold)}</span> {r.unit}
              </p>

              <p className="mt-1 text-base text-slate-600">
                Nivel: {SEVERITY_LABELS[r.severity as Severity]}
              </p>

              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base leading-relaxed text-slate-800">
                {r.messageEs}
              </p>

              {r.protocolReference && (
                <p className="mt-1 text-base text-slate-600">
                  Protocolo: {r.protocolReference}
                </p>
              )}

              <p className="mt-2 text-base font-medium text-slate-800">
                {ETIQUETA_ESTADO[r.status]} · versión {r.version}
              </p>

              {/* RF-13 — responsable y fecha de aprobación, a la vista. */}
              {r.approvedAt ? (
                <p className="text-base text-slate-600">
                  Aprobada el {fecha.format(r.approvedAt)}
                </p>
              ) : (
                <p className="text-base text-slate-600">Sin aprobación registrada</p>
              )}

              <div className="mt-3">
                <Link
                  href={`/admin/reglas/${r.id}`}
                  className="rounded-lg border-2 border-teal-800 px-4 py-2 text-base font-medium text-teal-800 hover:bg-teal-50"
                >
                  Editar
                </Link>
              </div>

              <ReglaAcciones id={r.id} status={r.status} aprobada={r.approvedBy !== null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

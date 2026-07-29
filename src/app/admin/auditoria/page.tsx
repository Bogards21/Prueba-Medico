import { listAudit } from '@/app/actions/admin';
import { requireRole } from '@/lib/roles';
import { auditScopeFor } from '@/domain/admin';
import type { Role } from '@/domain/content';

export const metadata = { title: 'Auditoría' };
export const dynamic = 'force-dynamic';

const AMBITO: Record<string, string> = {
  all: 'Ves todos los eventos registrados.',
  clinical: 'Ves los eventos clínicos: contenido, reglas y alertas mostradas.',
  account: 'Ves los eventos de cuentas: acceso, consentimientos y perfiles.',
};

const fechaHora = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function AdminAuditoriaPage() {
  // §15 — administrador, responsable clínico y soporte, cada uno con su alcance.
  const actor = await requireRole('admin', 'clinical_reviewer', 'support');
  const eventos = await listAudit();
  const ambito = auditScopeFor(actor.role as Role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Auditoría</h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          {ambito ? AMBITO[ambito] : ''}
        </p>
      </div>

      {eventos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-lg text-slate-700">No hay eventos en tu ámbito todavía.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[44rem] text-left">
            <caption className="sr-only">
              Últimos {eventos.length} eventos registrados en tu ámbito
            </caption>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-base font-semibold text-slate-800">
                  Cuándo
                </th>
                <th scope="col" className="px-4 py-3 text-base font-semibold text-slate-800">
                  Acción
                </th>
                <th scope="col" className="px-4 py-3 text-base font-semibold text-slate-800">
                  Entidad
                </th>
                <th scope="col" className="px-4 py-3 text-base font-semibold text-slate-800">
                  Quién
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-base tabular-nums text-slate-700">
                    {fechaHora.format(e.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-base text-slate-900">{e.action}</td>
                  <td className="px-4 py-3 text-base text-slate-700">{e.entityType}</td>
                  {/* RB-05 — el rastro sobrevive a la eliminación de la cuenta. */}
                  <td className="px-4 py-3 text-base break-all text-slate-700">
                    {e.actorEmail ?? 'Cuenta eliminada'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

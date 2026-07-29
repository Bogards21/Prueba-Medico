import { notFound } from 'next/navigation';
import { ReglaForm } from '../regla-form';
import { getRuleById } from '@/app/actions/rules';
import { requireRole } from '@/lib/roles';

export const metadata = { title: 'Editar regla clínica' };
export const dynamic = 'force-dynamic';

export default async function EditarReglaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('clinical_reviewer');

  const { id } = await params;
  const regla = await getRuleById(id);
  if (!regla) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Editar regla clínica
      </h1>
      <ReglaForm
        inicial={{
          id: regla.id,
          name: regla.name,
          variable: regla.variable,
          operator: regla.operator,
          threshold: String(Number(regla.threshold)),
          unit: regla.unit,
          severity: regla.severity,
          messageEs: regla.messageEs,
          protocolReference: regla.protocolReference,
          status: regla.status,
          approvedBy: regla.approvedBy,
        }}
      />
    </div>
  );
}

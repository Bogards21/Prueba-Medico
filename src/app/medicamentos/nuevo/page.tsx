import { MedicamentoForm } from './medicamento-form';
import { requireUserId } from '@/lib/current-user';

export const metadata = { title: 'Añadir medicamento' };
export const dynamic = 'force-dynamic';

export default async function NuevoMedicamentoPage() {
  await requireUserId();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Añadir un medicamento
      </h1>
      <MedicamentoForm />
    </div>
  );
}

import { ReglaForm } from '../regla-form';
import { requireRole } from '@/lib/roles';

export const metadata = { title: 'Nueva regla clínica' };
export const dynamic = 'force-dynamic';

export default async function NuevaReglaPage() {
  await requireRole('clinical_reviewer');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Nueva regla clínica
      </h1>
      <p className="text-lg leading-relaxed text-slate-600">
        Se guardará como borrador. Tendrás que aprobarla y activarla para que empiece a
        evaluarse.
      </p>
      <ReglaForm />
    </div>
  );
}

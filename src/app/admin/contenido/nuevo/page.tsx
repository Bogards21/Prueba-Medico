import { ContenidoForm } from '../contenido-form';
import { requireRole } from '@/lib/roles';

export const metadata = { title: 'Nuevo contenido' };
export const dynamic = 'force-dynamic';

export default async function NuevoContenidoPage() {
  await requireRole('admin', 'editor', 'clinical_reviewer');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Nuevo contenido</h1>
      <p className="text-lg leading-relaxed text-slate-600">
        Se guardará como borrador. Necesita aprobación clínica antes de poder publicarse.
      </p>
      <ContenidoForm />
    </div>
  );
}

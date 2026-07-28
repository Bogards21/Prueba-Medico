import { GlucoseForm } from './glucose-form';
import { getProfile } from '@/app/actions/profile';
import { requireUserId } from '@/lib/current-user';

export const metadata = { title: 'Registrar glucosa' };
export const dynamic = 'force-dynamic';

export default async function RegistrarGlucosaPage() {
  await requireUserId();
  // RF-03 — la unidad del perfil manda; el usuario no la reelige cada vez.
  const perfil = await getProfile();

  return (
    <div className="space-y-6">
      {/* §18.2 — una acción principal por pantalla. */}
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Registrar glucosa
      </h1>
      <GlucoseForm unidadPreferida={perfil?.glucoseUnit ?? 'mg/dL'} />
    </div>
  );
}

import { PerfilForm } from '../onboarding/perfil/perfil-form';
import { getProfile } from '@/app/actions/profile';
import { requireUserId } from '@/lib/current-user';

export const metadata = { title: 'Tu perfil' };
export const dynamic = 'force-dynamic';

/** RF-03: "el usuario podrá actualizar la información". */
export default async function PerfilPage() {
  await requireUserId();
  const perfil = await getProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tu perfil</h1>
      <PerfilForm inicial={perfil} destino="" />
    </div>
  );
}

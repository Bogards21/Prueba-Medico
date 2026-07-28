import { PerfilForm } from './perfil-form';
import { getProfile } from '@/app/actions/profile';

export const metadata = { title: 'Tu perfil' };
export const dynamic = 'force-dynamic';

export default async function PerfilOnboardingPage() {
  const perfil = await getProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Cuéntanos de ti</h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Solo lo necesario para adaptar la plataforma a tu caso. Podrás cambiarlo cuando
          quieras.
        </p>
      </div>

      <PerfilForm inicial={perfil} destino="/" />
    </div>
  );
}

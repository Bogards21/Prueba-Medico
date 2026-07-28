import { redirect } from 'next/navigation';
import { ConsentForm } from './consent-form';
import { requireUserIdRaw, getConsentRecords } from '@/lib/current-user';
import { pendingRequired, optionalDocuments, isSatisfied } from '@/domain/consent';

export const metadata = { title: 'Consentimientos' };
export const dynamic = 'force-dynamic';

export default async function ConsentimientosPage() {
  const userId = await requireUserIdRaw();
  const registros = await getConsentRecords(userId);

  const obligatoriosPendientes = pendingRequired(registros);

  // Ya está todo aceptado: no hay nada que hacer aquí.
  if (obligatoriosPendientes.length === 0) redirect('/');

  // Solo se ofrecen los opcionales que aún no están vigentes.
  const opcionalesPendientes = optionalDocuments().filter((d) => !isSatisfied(d, registros));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Antes de empezar
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Lee y acepta lo siguiente. Tú decides qué información compartes y para qué se usa.
        </p>
      </div>

      <ConsentForm obligatorios={obligatoriosPendientes} opcionales={opcionalesPendientes} />
    </div>
  );
}

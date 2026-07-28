import { PesoForm } from './peso-form';

export const metadata = { title: 'Registrar peso' };

export default function RegistrarPesoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Registrar peso</h1>
      <PesoForm />
    </div>
  );
}

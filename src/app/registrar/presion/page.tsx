import { PresionForm } from './presion-form';

export const metadata = { title: 'Registrar presión arterial' };

export default function RegistrarPresionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Registrar presión arterial
      </h1>
      <PresionForm />
    </div>
  );
}

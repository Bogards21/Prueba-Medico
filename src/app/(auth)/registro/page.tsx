import { RegistroForm } from './registro-form';

export const metadata = { title: 'Crear cuenta' };

export default function RegistroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Crea tu cuenta</h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Para guardar tus mediciones y llevar el seguimiento de tu diabetes.
        </p>
      </div>
      <RegistroForm />
    </div>
  );
}

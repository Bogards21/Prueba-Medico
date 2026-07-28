import { GlucoseForm } from './glucose-form';

export const metadata = { title: 'Registrar glucosa' };

export default function RegistrarGlucosaPage() {
  return (
    <div className="space-y-6">
      {/* §18.2 — una acción principal por pantalla. */}
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Registrar glucosa
      </h1>
      <GlucoseForm />
    </div>
  );
}

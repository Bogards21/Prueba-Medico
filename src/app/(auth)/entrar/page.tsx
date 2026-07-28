import { EntrarForm } from './entrar-form';

export const metadata = { title: 'Iniciar sesión' };

export default function EntrarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Inicia sesión</h1>
      <EntrarForm />
    </div>
  );
}

import Link from 'next/link';
import { requireUserId } from '@/lib/current-user';

export const metadata = { title: 'Registrar' };
export const dynamic = 'force-dynamic';

/** §18.2 — una acción principal por pantalla; aquí se elige cuál. */
const OPCIONES = [
  { href: '/registrar/glucosa', titulo: 'Glucosa', ayuda: 'El número que marca tu medidor.' },
  { href: '/registrar/peso', titulo: 'Peso', ayuda: 'Lo que marca tu báscula.' },
  {
    href: '/registrar/presion',
    titulo: 'Presión arterial',
    ayuda: 'Las dos cifras de tu tensiómetro.',
  },
];

export default async function RegistrarPage() {
  await requireUserId();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        ¿Qué quieres registrar?
      </h1>

      <ul className="space-y-3">
        {OPCIONES.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              className="block rounded-xl border-2 border-slate-300 bg-white px-5 py-4 hover:border-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <span className="block text-xl font-semibold text-slate-900">{o.titulo}</span>
              <span className="mt-1 block text-base text-slate-600">{o.ayuda}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

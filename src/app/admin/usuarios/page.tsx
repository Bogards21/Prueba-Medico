import { UsuarioAcciones } from './usuario-acciones';
import { listUsers } from '@/app/actions/admin';
import { requireRole } from '@/lib/roles';
import { ROLE_LABELS } from '@/domain/admin';
import type { Role } from '@/domain/content';

export const metadata = { title: 'Usuarios' };
export const dynamic = 'force-dynamic';

const ESTADO: Record<string, string> = {
  pending_verification: 'Pendiente de verificar su correo',
  active: 'Activa',
  suspended: 'Suspendida',
  deletion_requested: 'Eliminación solicitada',
};

const fecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminUsuariosPage() {
  // §15 — "Gestionar usuarios": administrador.
  const actor = await requireRole('admin');
  const cuentas = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}. Cada cambio de rol o
          de estado queda registrado en la auditoría.
        </p>
      </div>

      <ul className="space-y-3">
        {cuentas.map((u) => (
          <li key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-lg font-semibold break-all text-slate-900">{u.email}</p>
            <p className="text-base text-slate-700">{ROLE_LABELS[u.role as Role]}</p>
            {/* §17.6 — el estado va escrito, no solo por color. */}
            <p className="text-base text-slate-600">
              {ESTADO[u.status] ?? u.status} · alta del {fecha.format(u.createdAt)}
            </p>

            <UsuarioAcciones
              id={u.id}
              role={u.role as Role}
              suspendida={u.status === 'suspended'}
              esYoMismo={u.id === actor.userId}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

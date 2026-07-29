import Link from 'next/link';
import { getAdminMetrics } from '@/app/actions/admin';
import { requireRole } from '@/lib/roles';
import { canManageUsers, canViewAudit, ROLE_LABELS } from '@/domain/admin';
import { canCreate } from '@/domain/content';
import { canManageRules } from '@/domain/rules/governance';
import type { Role } from '@/domain/content';

export const metadata = { title: 'Panel' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const actor = await requireRole('admin', 'editor', 'clinical_reviewer', 'support', 'analyst');
  const rol = actor.role as Role;
  const m = await getAdminMetrics();

  /** §5.2 y §5.3 — activación y participación. Solo recuentos agregados. */
  const activacion = [
    { etiqueta: 'Cuentas creadas', valor: m.cuentas },
    { etiqueta: 'Correos verificados', valor: m.verificadas },
    { etiqueta: 'Con consentimientos aceptados', valor: m.conConsentimientos },
    { etiqueta: 'Con al menos una medición', valor: m.conPrimeraMedicion },
    { etiqueta: 'Con al menos un medicamento', valor: m.conMedicamento },
  ];

  const uso = [
    { etiqueta: 'Registros de glucosa (7 días)', valor: m.registrosUltimos7Dias },
    { etiqueta: 'Reportes generados', valor: m.reportesGenerados },
    { etiqueta: 'Contenidos publicados', valor: m.contenidoPublicado },
    { etiqueta: 'Reglas clínicas activas', valor: m.reglasActivas },
    { etiqueta: 'Alertas mostradas', valor: m.alertasMostradas },
  ];

  const secciones = [
    canCreate(rol) && { href: '/admin/contenido', titulo: 'Contenido', ayuda: 'Redactar, revisar y publicar material educativo.' },
    canManageRules(rol) && { href: '/admin/reglas', titulo: 'Reglas clínicas', ayuda: 'Definir, aprobar y activar reglas.' },
    canManageUsers(rol) && { href: '/admin/usuarios', titulo: 'Usuarios', ayuda: 'Roles y estado de las cuentas.' },
    canViewAudit(rol) && { href: '/admin/auditoria', titulo: 'Auditoría', ayuda: 'Eventos registrados en tu ámbito.' },
  ].filter(Boolean) as { href: string; titulo: string; ayuda: string }[];

  const Tarjetas = ({ datos }: { datos: { etiqueta: string; valor: number }[] }) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {datos.map((d) => (
        <div key={d.etiqueta} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-base text-slate-600">{d.etiqueta}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{d.valor}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Panel</h1>
        <p className="mt-1 text-base text-slate-600">Tu rol: {ROLE_LABELS[rol]}</p>
      </div>

      {secciones.length > 0 && (
        <section aria-labelledby="secciones-titulo" className="space-y-3">
          <h2 id="secciones-titulo" className="text-xl font-semibold text-slate-900">
            Qué puedes gestionar
          </h2>
          <ul className="space-y-3">
            {secciones.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="block rounded-xl border-2 border-slate-300 bg-white px-5 py-4 hover:border-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  <span className="block text-xl font-semibold text-slate-900">{s.titulo}</span>
                  <span className="mt-1 block text-base text-slate-600">{s.ayuda}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="activacion-titulo" className="space-y-3">
        <h2 id="activacion-titulo" className="text-xl font-semibold text-slate-900">
          Activación
        </h2>
        <Tarjetas datos={activacion} />
      </section>

      <section aria-labelledby="uso-titulo" className="space-y-3">
        <h2 id="uso-titulo" className="text-xl font-semibold text-slate-900">
          Uso
        </h2>
        <Tarjetas datos={uso} />
        {/* §17.2 — minimización: aquí no aparece ningún dato de salud individual. */}
        <p className="text-base leading-relaxed text-slate-600">
          Son recuentos agregados. Esta pantalla no muestra mediciones ni datos de personas
          concretas.
        </p>
      </section>
    </div>
  );
}

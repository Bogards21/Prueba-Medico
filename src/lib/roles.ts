import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { getSessionUserId } from './session';
import type { Role } from '@/domain/content';

export interface ActorConRol {
  userId: string;
  role: Role;
}

/** Usuario de la sesión con su rol, sin exigir onboarding de paciente. */
export async function getActor(): Promise<ActorConRol | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const db = await getDb();
  const [fila] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!fila || fila.status === 'suspended') return null;

  return { userId: fila.id, role: fila.role as Role };
}

/**
 * Exige que la sesión pertenezca a alguno de los roles indicados.
 *
 * §17.1 — principio de mínimo privilegio. Las pantallas internas no se
 * protegen solo ocultando enlaces: cada acción vuelve a comprobar el rol
 * contra la base, porque el enlace oculto no impide una petición directa.
 */
export async function requireRole(...permitidos: Role[]): Promise<ActorConRol> {
  const actor = await getActor();
  if (!actor) redirect('/entrar');
  if (!permitidos.includes(actor.role)) redirect('/');
  return actor;
}

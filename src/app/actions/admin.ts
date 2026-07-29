'use server';

import { revalidatePath } from 'next/cache';
import { and, count, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { getDb } from '@/db/client';
import {
  users,
  auditLogs,
  glucoseRecords,
  consents,
  contents,
  clinicalRules,
  alertEvents,
  reports,
  medications,
} from '@/db/schema';
import {
  canAssignRole,
  canSuspendAccount,
  canViewAudit,
  auditScopeFor,
  entitiesForScope,
  ASSIGNABLE_ROLES,
} from '@/domain/admin';
import type { Role } from '@/domain/content';
import { getActor } from '@/lib/roles';

export type AdminResult = { ok: true } | { ok: false; error: string };

/* ─────────────────────────── Gestión de usuarios ───────────────────────── */

export async function assignRole(targetId: string, role: string): Promise<AdminResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: 'Tu sesión expiró.' };

  if (!ASSIGNABLE_ROLES.includes(role as Role)) {
    return { ok: false, error: 'Ese rol no existe.' };
  }

  if (!canAssignRole(actor.role, actor.userId, targetId)) {
    return {
      ok: false,
      error:
        actor.userId === targetId
          ? 'No puedes cambiar tu propio rol. Pídeselo a otro administrador.'
          : 'No tienes permiso para cambiar roles.',
    };
  }

  const db = await getDb();
  const [antes] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!antes) return { ok: false, error: 'No encontramos esa cuenta.' };

  await db.update(users).set({ role: role as Role }).where(eq(users.id, targetId));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: 'user_role_changed',
    entityType: 'users',
    entityId: targetId,
    metadata: { from: antes.role, to: role, email: antes.email },
  });

  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function setAccountSuspended(
  targetId: string,
  suspender: boolean,
): Promise<AdminResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: 'Tu sesión expiró.' };

  if (!canSuspendAccount(actor.role, actor.userId, targetId)) {
    return {
      ok: false,
      error:
        actor.userId === targetId
          ? 'No puedes suspender tu propia cuenta.'
          : 'No tienes permiso para suspender cuentas.',
    };
  }

  const db = await getDb();
  const [antes] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!antes) return { ok: false, error: 'No encontramos esa cuenta.' };

  await db
    .update(users)
    .set({ status: suspender ? 'suspended' : 'active' })
    .where(eq(users.id, targetId));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: suspender ? 'account_suspended' : 'account_reactivated',
    entityType: 'users',
    entityId: targetId,
    metadata: { from: antes.status, email: antes.email },
  });

  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function listUsers() {
  const db = await getDb();

  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);
}

/* ──────────────────────────────── Auditoría ────────────────────────────── */

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string | null;
  metadata: unknown;
  createdAt: Date;
}

/**
 * RF-16 — auditoría consultable, acotada al ámbito del rol (§15 "Limitado").
 * El filtro se aplica en SQL, no al pintar: lo que está fuera del ámbito no
 * llega al servidor de la pantalla.
 */
export async function listAudit(): Promise<AuditEntry[]> {
  const actor = await getActor();
  if (!actor || !canViewAudit(actor.role)) return [];

  const scope = auditScopeFor(actor.role);
  if (!scope) return [];

  const entidades = entitiesForScope(scope);
  const db = await getDb();

  const filas = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(entidades ? inArray(auditLogs.entityType, entidades) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return filas;
}

/* ───────────────────────── Métricas de producto (§5) ───────────────────── */

export interface AdminMetrics {
  cuentas: number;
  verificadas: number;
  conConsentimientos: number;
  conPrimeraMedicion: number;
  conMedicamento: number;
  registrosUltimos7Dias: number;
  reportesGenerados: number;
  contenidoPublicado: number;
  reglasActivas: number;
  alertasMostradas: number;
}

async function contar(consulta: Promise<{ n: number }[]>): Promise<number> {
  const [fila] = await consulta;
  return Number(fila?.n ?? 0);
}

/** §5.2 y §5.3 — activación y participación. Recuentos, sin datos personales. */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const db = await getDb();
  const hace7Dias = new Date(Date.now() - 7 * 86_400_000);

  const distintos = (columna: AnyPgColumn) =>
    sql<number>`count(distinct ${columna})`.as('n');

  const [
    cuentas,
    verificadas,
    conConsentimientos,
    conPrimeraMedicion,
    conMedicamento,
    registrosUltimos7Dias,
    reportesGenerados,
    contenidoPublicado,
    reglasActivas,
    alertasMostradas,
  ] = await Promise.all([
    contar(db.select({ n: count().as('n') }).from(users)),
    contar(
      db.select({ n: count().as('n') }).from(users).where(isNotNull(users.emailVerifiedAt)),
    ),
    contar(db.select({ n: distintos(consents.userId) }).from(consents)),
    contar(db.select({ n: distintos(glucoseRecords.userId) }).from(glucoseRecords)),
    contar(db.select({ n: distintos(medications.userId) }).from(medications)),
    contar(
      db
        .select({ n: count().as('n') })
        .from(glucoseRecords)
        .where(gte(glucoseRecords.createdAt, hace7Dias)),
    ),
    contar(db.select({ n: count().as('n') }).from(reports)),
    contar(
      db.select({ n: count().as('n') }).from(contents).where(eq(contents.status, 'published')),
    ),
    contar(
      db
        .select({ n: count().as('n') })
        .from(clinicalRules)
        .where(and(eq(clinicalRules.status, 'active'), isNotNull(clinicalRules.approvedBy))),
    ),
    contar(db.select({ n: count().as('n') }).from(alertEvents)),
  ]);

  return {
    cuentas,
    verificadas,
    conConsentimientos,
    conPrimeraMedicion,
    conMedicamento,
    registrosUltimos7Dias,
    reportesGenerados,
    contenidoPublicado,
    reglasActivas,
    alertasMostradas,
  };
}

/**
 * Panel administrativo — RF-16, §15, §17.1, §17.2.
 *
 * Dos decisiones que no son obvias y conviene dejar escritas:
 *
 * 1. Nadie cambia su propio rol. Un administrador que pudiera auto-asignarse
 *    `clinical_reviewer` se saltaría RB-06 por completo: bastaría con
 *    promoverse para aprobar reglas clínicas y contenido médico. Prohibir
 *    cualquier cambio de rol sobre la propia cuenta cierra ese camino y de
 *    paso evita el autobloqueo.
 *
 * 2. El §15 dice que responsable clínico y soporte tienen acceso "Limitado"
 *    a la auditoría, sin concretar. Aquí se concreta por ÁMBITO: lo clínico
 *    para quien revisa lo clínico, lo de cuentas para quien atiende cuentas.
 *    El registro de auditoría describe datos de salud, así que es tan
 *    sensible como ellos (§17.2, minimización).
 */

import type { Role } from './content';

export const ASSIGNABLE_ROLES: readonly Role[] = [
  'patient',
  'admin',
  'editor',
  'clinical_reviewer',
  'support',
  'analyst',
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  patient: 'Paciente',
  admin: 'Administrador general',
  editor: 'Editor',
  clinical_reviewer: 'Responsable clínico',
  support: 'Soporte',
  analyst: 'Analista',
};

/* ─────────────────────────── Gestión de usuarios ───────────────────────── */

/** §15 — "Gestionar usuarios": solo el administrador reasigna roles. */
export function canManageUsers(role: Role): boolean {
  return role === 'admin';
}

export function canAssignRole(
  actorRole: Role,
  actorId: string,
  targetId: string,
): boolean {
  if (!canManageUsers(actorRole)) return false;
  // Ver nota 1 de la cabecera.
  return actorId !== targetId;
}

export function canSuspendAccount(
  actorRole: Role,
  actorId: string,
  targetId: string,
): boolean {
  if (!canManageUsers(actorRole)) return false;
  return actorId !== targetId;
}

/* ──────────────────────────────── Auditoría ────────────────────────────── */

export type AuditScope = 'all' | 'clinical' | 'account';

export function canViewAudit(role: Role): boolean {
  return role === 'admin' || role === 'clinical_reviewer' || role === 'support';
}

export function auditScopeFor(role: Role): AuditScope | null {
  switch (role) {
    case 'admin':
      return 'all';
    case 'clinical_reviewer':
      return 'clinical';
    case 'support':
      return 'account';
    default:
      return null;
  }
}

/** Entidades que corresponden a cada ámbito. */
const ENTIDADES_CLINICAS = new Set(['contents', 'clinical_rules', 'alert_events']);
const ENTIDADES_CUENTA = new Set(['users', 'consents', 'profiles', 'subscriptions']);

export function entityInAuditScope(scope: AuditScope, entityType: string): boolean {
  switch (scope) {
    case 'all':
      return true;
    case 'clinical':
      return ENTIDADES_CLINICAS.has(entityType);
    case 'account':
      return ENTIDADES_CUENTA.has(entityType);
  }
}

/** Entidades visibles en un ámbito, para filtrar en la consulta SQL. */
export function entitiesForScope(scope: AuditScope): string[] | null {
  switch (scope) {
    case 'all':
      return null; // sin filtro
    case 'clinical':
      return [...ENTIDADES_CLINICAS];
    case 'account':
      return [...ENTIDADES_CUENTA];
  }
}

import { describe, it, expect } from 'vitest';
import {
  canManageUsers,
  canAssignRole,
  canSuspendAccount,
  canViewAudit,
  auditScopeFor,
  entityInAuditScope,
  ASSIGNABLE_ROLES,
} from '@/domain/admin';

describe('canManageUsers (§15)', () => {
  it('el administrador gestiona usuarios', () => {
    expect(canManageUsers('admin')).toBe(true);
  });

  // §15 — "Gestionar usuarios: Soporte Limitado". Puede ver, no reasignar.
  it('soporte no gestiona usuarios en el sentido de reasignar roles', () => {
    expect(canManageUsers('support')).toBe(false);
  });

  it('nadie más gestiona usuarios', () => {
    for (const rol of ['patient', 'editor', 'clinical_reviewer', 'analyst'] as const) {
      expect(canManageUsers(rol)).toBe(false);
    }
  });
});

describe('canAssignRole', () => {
  it('un administrador asigna roles a otras cuentas', () => {
    expect(canAssignRole('admin', 'admin-1', 'otra-cuenta')).toBe(true);
  });

  /**
   * Un administrador que pudiera darse a sí mismo el rol de responsable
   * clínico se saltaría RB-06 por completo: bastaría con auto-promoverse para
   * aprobar reglas clínicas. Cerrar la puerta a cualquier cambio de rol sobre
   * la propia cuenta cubre ese camino y además evita el autobloqueo.
   */
  it('un administrador NO puede cambiar su propio rol', () => {
    expect(canAssignRole('admin', 'admin-1', 'admin-1')).toBe(false);
  });

  it('quien no gestiona usuarios no asigna roles', () => {
    expect(canAssignRole('support', 's-1', 'otra')).toBe(false);
    expect(canAssignRole('clinical_reviewer', 'c-1', 'otra')).toBe(false);
    expect(canAssignRole('patient', 'p-1', 'otra')).toBe(false);
  });

  it('los roles asignables están declarados y son los del §15', () => {
    expect([...ASSIGNABLE_ROLES].sort()).toEqual(
      ['admin', 'analyst', 'clinical_reviewer', 'editor', 'patient', 'support'].sort(),
    );
  });
});

describe('canSuspendAccount', () => {
  it('el administrador suspende otras cuentas', () => {
    expect(canSuspendAccount('admin', 'admin-1', 'otra')).toBe(true);
  });

  it('nadie se suspende a sí mismo', () => {
    expect(canSuspendAccount('admin', 'admin-1', 'admin-1')).toBe(false);
  });

  it('soporte no suspende cuentas', () => {
    expect(canSuspendAccount('support', 's-1', 'otra')).toBe(false);
  });
});

describe('canViewAudit (§15)', () => {
  // §15 — Admin "Sí"; Responsable clínico "Limitado"; Soporte "Limitado".
  it('administrador, responsable clínico y soporte pueden consultar auditoría', () => {
    expect(canViewAudit('admin')).toBe(true);
    expect(canViewAudit('clinical_reviewer')).toBe(true);
    expect(canViewAudit('support')).toBe(true);
  });

  it('paciente, editor y analista no consultan auditoría', () => {
    expect(canViewAudit('patient')).toBe(false);
    expect(canViewAudit('editor')).toBe(false);
    expect(canViewAudit('analyst')).toBe(false);
  });
});

describe('auditScopeFor', () => {
  it('el administrador ve todo', () => {
    expect(auditScopeFor('admin')).toBe('all');
  });

  /**
   * "Limitado" se concreta así: el responsable clínico ve lo clínico y
   * soporte ve lo de cuentas. §17.2 pide minimización, y el registro de
   * auditoría es tan sensible como los datos que describe.
   */
  it('el responsable clínico se limita a lo clínico', () => {
    expect(auditScopeFor('clinical_reviewer')).toBe('clinical');
  });

  it('soporte se limita a lo de cuentas', () => {
    expect(auditScopeFor('support')).toBe('account');
  });

  it('quien no puede consultar no tiene alcance', () => {
    expect(auditScopeFor('patient')).toBeNull();
    expect(auditScopeFor('editor')).toBeNull();
  });
});

describe('entityInAuditScope', () => {
  it('con alcance total entra cualquier entidad', () => {
    for (const e of ['users', 'contents', 'clinical_rules', 'glucose_records']) {
      expect(entityInAuditScope('all', e)).toBe(true);
    }
  });

  it('el alcance clínico incluye contenido, reglas y alertas', () => {
    expect(entityInAuditScope('clinical', 'contents')).toBe(true);
    expect(entityInAuditScope('clinical', 'clinical_rules')).toBe(true);
    expect(entityInAuditScope('clinical', 'alert_events')).toBe(true);
  });

  it('el alcance clínico NO incluye mediciones de personas concretas', () => {
    expect(entityInAuditScope('clinical', 'glucose_records')).toBe(false);
    expect(entityInAuditScope('clinical', 'weight_records')).toBe(false);
    expect(entityInAuditScope('clinical', 'reports')).toBe(false);
  });

  it('el alcance de cuentas incluye cuentas y consentimientos', () => {
    expect(entityInAuditScope('account', 'users')).toBe(true);
    expect(entityInAuditScope('account', 'consents')).toBe(true);
  });

  it('el alcance de cuentas NO incluye datos clínicos', () => {
    expect(entityInAuditScope('account', 'glucose_records')).toBe(false);
    expect(entityInAuditScope('account', 'clinical_rules')).toBe(false);
    expect(entityInAuditScope('account', 'alert_events')).toBe(false);
  });
});

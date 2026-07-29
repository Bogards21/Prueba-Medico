import { describe, it, expect } from 'vitest';
import {
  canManageRules,
  validateRuleDraft,
  statusAfterRuleEdit,
  ruleEditRevokesApproval,
  canActivateRule,
  RULE_VARIABLES,
  RULE_OPERATORS,
} from '@/domain/rules/governance';
import type { ClinicalRule } from '@/domain/rules/types';

const borrador = () => ({
  name: 'Glucosa muy alta confirmada',
  variable: 'glucose' as const,
  operator: 'gt' as const,
  threshold: 300,
  unit: 'mg/dL',
  severity: 'seek_care' as const,
  messageEs: 'Este valor es alto. Comunícate con tu profesional de salud.',
  protocolReference: 'Guía interna 2026, sección 4',
});

const regla = (over: Partial<ClinicalRule> = {}): ClinicalRule => ({
  id: 'r1',
  name: 'Glucosa muy alta confirmada',
  variable: 'glucose',
  operator: 'gt',
  threshold: 300,
  unit: 'mg/dL',
  severity: 'seek_care',
  messageEs: 'Este valor es alto. Comunícate con tu profesional de salud.',
  version: 1,
  status: 'draft',
  approvedBy: null,
  approvedAt: null,
  ...over,
});

describe('canManageRules (§15, RB-06)', () => {
  /**
   * §15 — "Gestionar reglas clínicas: solo Responsable clínico". RB-06 lo
   * refuerza: "las modificaciones de reglas clínicas requerirán permisos
   * especiales". Ni el administrador general entra aquí.
   */
  it('solo el responsable clínico gestiona reglas', () => {
    expect(canManageRules('clinical_reviewer')).toBe(true);
    expect(canManageRules('admin')).toBe(false);
    expect(canManageRules('editor')).toBe(false);
    expect(canManageRules('support')).toBe(false);
    expect(canManageRules('analyst')).toBe(false);
    expect(canManageRules('patient')).toBe(false);
  });
});

describe('validateRuleDraft', () => {
  it('acepta un borrador completo', () => {
    expect(validateRuleDraft(borrador())).toEqual({ ok: true });
  });

  it('exige nombre', () => {
    expect(validateRuleDraft({ ...borrador(), name: '  ' }).ok).toBe(false);
  });

  it('exige un umbral numérico', () => {
    expect(validateRuleDraft({ ...borrador(), threshold: Number.NaN }).ok).toBe(false);
  });

  it('exige unidad', () => {
    expect(validateRuleDraft({ ...borrador(), unit: '' }).ok).toBe(false);
  });

  /**
   * §22.4 — "los mensajes deben pasar por revisión clínica". Un mensaje vacío
   * o de una palabra no es un mensaje revisable; se exige algo redactado.
   */
  it('exige un mensaje con contenido real', () => {
    expect(validateRuleDraft({ ...borrador(), messageEs: '' }).ok).toBe(false);
    expect(validateRuleDraft({ ...borrador(), messageEs: 'alto' }).ok).toBe(false);
  });

  // §22.10 — "los mensajes deben aclarar límites"; §22.9 — no ajustar medicamentos.
  it('rechaza un mensaje que indica cambiar la medicación', () => {
    const r = validateRuleDraft({
      ...borrador(),
      messageEs: 'Sube la dosis de metformina a dos tabletas hoy mismo.',
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/dosis|medicamento/i);
  });

  it('rechaza un mensaje que suspende un tratamiento', () => {
    const r = validateRuleDraft({
      ...borrador(),
      messageEs: 'Deja de tomar tu medicamento hasta nuevo aviso.',
    });
    expect(r.ok).toBe(false);
  });

  it('rechaza una variable o un operador desconocidos', () => {
    expect(validateRuleDraft({ ...borrador(), variable: 'presion' as never }).ok).toBe(false);
    expect(validateRuleDraft({ ...borrador(), operator: 'entre' as never }).ok).toBe(false);
  });

  it('los catálogos están declarados', () => {
    expect(RULE_VARIABLES.length).toBeGreaterThan(0);
    expect(RULE_OPERATORS.length).toBeGreaterThan(0);
  });
});

describe('canActivateRule (§22.15, RB-02)', () => {
  it('permite activar una regla aprobada', () => {
    const r = regla({ status: 'draft', approvedBy: 'clinico-1', approvedAt: new Date() });
    expect(canActivateRule(r)).toBe(true);
  });

  it('no permite activar sin aprobación', () => {
    expect(canActivateRule(regla())).toBe(false);
    expect(canActivateRule(regla({ approvedBy: 'clinico-1' }))).toBe(false);
    expect(canActivateRule(regla({ approvedAt: new Date() }))).toBe(false);
  });
});

describe('edición de una regla ya aprobada', () => {
  /**
   * El mismo razonamiento que CA-09 para el contenido: si editar no revocara
   * la aprobación, se podría aprobar una regla inocua y después cambiarle el
   * umbral o el mensaje sin que nadie volviera a revisarla.
   */
  it('editar una regla activa la devuelve a borrador', () => {
    expect(statusAfterRuleEdit('active')).toBe('draft');
  });

  it('editar una regla desactivada la devuelve a borrador', () => {
    expect(statusAfterRuleEdit('inactive')).toBe('draft');
  });

  it('editar un borrador lo deja en borrador', () => {
    expect(statusAfterRuleEdit('draft')).toBe('draft');
  });

  it('editar revoca la aprobación salvo que ya fuera borrador sin aprobar', () => {
    expect(ruleEditRevokesApproval(regla({ status: 'active', approvedBy: 'c1' }))).toBe(true);
    expect(ruleEditRevokesApproval(regla({ status: 'inactive', approvedBy: 'c1' }))).toBe(true);
    expect(ruleEditRevokesApproval(regla())).toBe(false);
  });
});

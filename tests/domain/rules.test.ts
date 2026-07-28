import { describe, it, expect } from 'vitest';
import { evaluateRules } from '@/domain/rules/engine';
import type { ClinicalRule } from '@/domain/rules/types';

const approved = (over: Partial<ClinicalRule> = {}): ClinicalRule => ({
  id: 'r1',
  name: 'Glucosa alta confirmada',
  variable: 'glucose',
  operator: 'gt',
  threshold: 300,
  unit: 'mg/dL',
  severity: 'seek_care',
  messageEs: 'Este valor es alto. Comunícate con tu profesional de salud.',
  version: 1,
  status: 'active',
  approvedBy: 'user-clinico-1',
  approvedAt: new Date('2026-01-01'),
  ...over,
});

describe('evaluateRules', () => {
  it('dispara una regla aprobada cuando se cumple la condición', () => {
    const out = evaluateRules([approved()], { variable: 'glucose', value: 350 });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('seek_care');
    expect(out[0].ruleVersion).toBe(1);
    expect(out[0].messageEs).toContain('profesional de salud');
  });

  // RB-02 + §22.15: sin aprobación no se evalúa.
  it('ignora una regla sin approvedBy aunque su condición se cumpla', () => {
    const r = approved({ approvedBy: null, approvedAt: null, status: 'draft' });
    expect(evaluateRules([r], { variable: 'glucose', value: 350 })).toEqual([]);
  });

  it('ignora una regla activa a la que le falta approvedAt', () => {
    const r = approved({ approvedAt: null });
    expect(evaluateRules([r], { variable: 'glucose', value: 350 })).toEqual([]);
  });

  // §22.5: debe poder desactivarse.
  it('ignora una regla desactivada', () => {
    const r = approved({ status: 'inactive' });
    expect(evaluateRules([r], { variable: 'glucose', value: 350 })).toEqual([]);
  });

  it('no dispara cuando no se cumple la condición', () => {
    expect(evaluateRules([approved()], { variable: 'glucose', value: 120 })).toEqual([]);
  });

  it('ignora reglas de otra variable', () => {
    expect(evaluateRules([approved()], { variable: 'weight', value: 350 })).toEqual([]);
  });

  // §13.6 "varias reglas coinciden" → prioridad por gravedad.
  it('ordena varias coincidencias por gravedad descendente', () => {
    const info = approved({ id: 'r2', severity: 'informational', threshold: 200 });
    const out = evaluateRules([info, approved()], { variable: 'glucose', value: 350 });
    expect(out.map((e) => e.ruleId)).toEqual(['r1', 'r2']);
  });

  // RB-09: sin dato no se evalúa nada.
  it('no evalúa cuando el valor es null', () => {
    expect(evaluateRules([approved()], { variable: 'glucose', value: null })).toEqual([]);
  });

  it('soporta los operadores de comparación restantes', () => {
    const bajo = approved({ operator: 'lt', threshold: 70, severity: 'needs_review' });
    expect(evaluateRules([bajo], { variable: 'glucose', value: 55 })).toHaveLength(1);
    expect(evaluateRules([bajo], { variable: 'glucose', value: 85 })).toHaveLength(0);

    const gte = approved({ operator: 'gte', threshold: 300 });
    expect(evaluateRules([gte], { variable: 'glucose', value: 300 })).toHaveLength(1);

    const lte = approved({ operator: 'lte', threshold: 70 });
    expect(evaluateRules([lte], { variable: 'glucose', value: 70 })).toHaveLength(1);
  });

  it('no muta el arreglo de reglas que recibe', () => {
    const reglas = [
      approved({ id: 'a', severity: 'informational', threshold: 200 }),
      approved({ id: 'b', severity: 'potential_emergency' }),
    ];
    const orden = reglas.map((r) => r.id);
    evaluateRules(reglas, { variable: 'glucose', value: 350 });
    expect(reglas.map((r) => r.id)).toEqual(orden);
  });
});

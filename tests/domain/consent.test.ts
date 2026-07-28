import { describe, it, expect } from 'vitest';
import {
  CONSENT_CATALOG,
  optionalDocuments,
  pendingRequired,
  grantedOptional,
  isSatisfied,
} from '@/domain/consent';
import type { ConsentRecord } from '@/domain/consent';

const doc = (tipo: string) => CONSENT_CATALOG.find((d) => d.type === tipo)!;

const aceptado = (over: Partial<ConsentRecord> & { consentType: ConsentRecord['consentType'] }): ConsentRecord => ({
  documentVersion: doc(over.consentType).version,
  accepted: true,
  revokedAt: null,
  ...over,
});

describe('CONSENT_CATALOG', () => {
  it('marca como obligatorios términos, privacidad y tratamiento de datos', () => {
    const obligatorios = CONSENT_CATALOG.filter((d) => d.required).map((d) => d.type);
    expect(obligatorios).toEqual(['terms', 'privacy_notice', 'data_processing']);
  });

  it('todo documento declara versión (RF-02: "cada consentimiento tendrá versión y fecha")', () => {
    for (const d of CONSENT_CATALOG) {
      expect(d.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('pendingRequired', () => {
  it('exige los tres obligatorios a una cuenta nueva (CA-02)', () => {
    expect(pendingRequired([]).map((d) => d.type)).toEqual([
      'terms',
      'privacy_notice',
      'data_processing',
    ]);
  });

  it('no exige nada cuando se aceptaron todos los obligatorios vigentes', () => {
    const registros = [
      aceptado({ consentType: 'terms' }),
      aceptado({ consentType: 'privacy_notice' }),
      aceptado({ consentType: 'data_processing' }),
    ];
    expect(pendingRequired(registros)).toEqual([]);
  });

  // RF-02: una versión nueva del documento vuelve a requerir aceptación.
  it('vuelve a exigir el documento si se aceptó una versión anterior', () => {
    const registros = [
      aceptado({ consentType: 'terms', documentVersion: '2020-01-01' }),
      aceptado({ consentType: 'privacy_notice' }),
      aceptado({ consentType: 'data_processing' }),
    ];
    expect(pendingRequired(registros).map((d) => d.type)).toEqual(['terms']);
  });

  // CA-08: al revocar, el uso asociado se detiene.
  it('vuelve a exigir el documento si fue revocado', () => {
    const registros = [
      aceptado({ consentType: 'terms', revokedAt: new Date('2026-07-01') }),
      aceptado({ consentType: 'privacy_notice' }),
      aceptado({ consentType: 'data_processing' }),
    ];
    expect(pendingRequired(registros).map((d) => d.type)).toEqual(['terms']);
  });

  it('no da por aceptado un registro con accepted=false', () => {
    const registros = [aceptado({ consentType: 'terms', accepted: false })];
    expect(pendingRequired(registros).map((d) => d.type)).toContain('terms');
  });

  it('ignora los opcionales: nunca bloquean el acceso', () => {
    const registros = [
      aceptado({ consentType: 'terms' }),
      aceptado({ consentType: 'privacy_notice' }),
      aceptado({ consentType: 'data_processing' }),
    ];
    expect(pendingRequired(registros)).toEqual([]);
    expect(CONSENT_CATALOG.some((d) => !d.required)).toBe(true);
  });

  it('reconoce una reaceptación posterior a una revocación', () => {
    const registros = [
      aceptado({ consentType: 'terms', revokedAt: new Date('2026-07-01') }),
      aceptado({ consentType: 'terms' }),
      aceptado({ consentType: 'privacy_notice' }),
      aceptado({ consentType: 'data_processing' }),
    ];
    expect(pendingRequired(registros)).toEqual([]);
  });
});

describe('optionalDocuments', () => {
  // RF-02: "los consentimientos opcionales no podrán estar preseleccionados".
  it('ningún opcional viene preseleccionado', () => {
    for (const d of optionalDocuments()) {
      expect(d.defaultChecked).toBe(false);
    }
  });

  it('devuelve comunicaciones y análisis agregado', () => {
    expect(optionalDocuments().map((d) => d.type)).toEqual([
      'communications',
      'aggregate_analytics',
    ]);
  });
});

describe('grantedOptional', () => {
  it('lista solo los opcionales vigentes', () => {
    const registros = [
      aceptado({ consentType: 'communications' }),
      aceptado({ consentType: 'aggregate_analytics', revokedAt: new Date() }),
    ];
    expect(grantedOptional(registros)).toEqual(['communications']);
  });
});

describe('isSatisfied', () => {
  it('exige coincidencia exacta de versión', () => {
    const d = doc('terms');
    expect(isSatisfied(d, [aceptado({ consentType: 'terms' })])).toBe(true);
    expect(
      isSatisfied(d, [aceptado({ consentType: 'terms', documentVersion: '1999-01-01' })]),
    ).toBe(false);
  });
});

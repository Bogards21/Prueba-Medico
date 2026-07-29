import { describe, it, expect } from 'vitest';
import {
  canTransition,
  statusAfterEdit,
  canPublish,
  isVisibleToPatient,
  isReviewStale,
  canCreate,
  canApprove,
  REVIEW_VALID_MONTHS,
  CONTENT_CATEGORIES,
} from '@/domain/content';
import type { ContentRecord } from '@/domain/content';

const AHORA = new Date('2026-07-29T12:00:00Z');

const contenido = (over: Partial<ContentRecord> = {}): ContentRecord => ({
  status: 'published',
  reviewerId: 'revisor-1',
  clinicalReviewDate: new Date('2026-06-01T00:00:00Z'),
  publishedAt: new Date('2026-06-02T00:00:00Z'),
  version: 1,
  ...over,
});

describe('permisos (§15)', () => {
  it('editores, administradores y revisores clínicos pueden crear contenido', () => {
    expect(canCreate('editor')).toBe(true);
    expect(canCreate('admin')).toBe(true);
    expect(canCreate('clinical_reviewer')).toBe(true);
  });

  it('pacientes, soporte y analistas no pueden crear contenido', () => {
    expect(canCreate('patient')).toBe(false);
    expect(canCreate('support')).toBe(false);
    expect(canCreate('analyst')).toBe(false);
  });

  // §15 — "Aprobar contenido clínico: solo Responsable clínico".
  it('SOLO el responsable clínico puede aprobar', () => {
    expect(canApprove('clinical_reviewer')).toBe(true);
    expect(canApprove('admin')).toBe(false);
    expect(canApprove('editor')).toBe(false);
    expect(canApprove('patient')).toBe(false);
    expect(canApprove('support')).toBe(false);
  });
});

describe('canTransition', () => {
  it('un editor envía un borrador a revisión', () => {
    expect(canTransition('editor', 'draft', 'in_review')).toBe(true);
  });

  // RB-07 — "el contenido médico no podrá publicarse sin aprobación".
  it('un editor NO puede aprobar contenido en revisión', () => {
    expect(canTransition('editor', 'in_review', 'approved')).toBe(false);
  });

  it('un administrador tampoco puede aprobar', () => {
    expect(canTransition('admin', 'in_review', 'approved')).toBe(false);
  });

  it('el responsable clínico aprueba y también puede devolver a borrador', () => {
    expect(canTransition('clinical_reviewer', 'in_review', 'approved')).toBe(true);
    expect(canTransition('clinical_reviewer', 'in_review', 'draft')).toBe(true);
  });

  it('un editor NO puede saltarse la revisión publicando un borrador', () => {
    expect(canTransition('editor', 'draft', 'published')).toBe(false);
  });

  it('lo aprobado se puede publicar', () => {
    expect(canTransition('editor', 'approved', 'published')).toBe(true);
    expect(canTransition('admin', 'approved', 'published')).toBe(true);
  });

  it('lo publicado se puede retirar', () => {
    expect(canTransition('admin', 'published', 'retired')).toBe(true);
    expect(canTransition('clinical_reviewer', 'published', 'retired')).toBe(true);
  });

  it('un paciente no puede cambiar ningún estado', () => {
    expect(canTransition('patient', 'draft', 'in_review')).toBe(false);
    expect(canTransition('patient', 'approved', 'published')).toBe(false);
  });
});

describe('statusAfterEdit', () => {
  /**
   * CA-09 — "cuando un editor guarda los cambios, el contenido permanece en
   * revisión hasta recibir aprobación clínica".
   */
  it('editar contenido publicado lo devuelve a revisión', () => {
    expect(statusAfterEdit('published')).toBe('in_review');
  });

  it('editar contenido aprobado lo devuelve a revisión', () => {
    expect(statusAfterEdit('approved')).toBe('in_review');
  });

  it('editar un borrador lo deja en borrador', () => {
    expect(statusAfterEdit('draft')).toBe('draft');
  });

  it('editar algo en revisión lo deja en revisión', () => {
    expect(statusAfterEdit('in_review')).toBe('in_review');
  });

  it('editar algo retirado lo devuelve a borrador', () => {
    expect(statusAfterEdit('retired')).toBe('draft');
  });
});

describe('canPublish', () => {
  it('permite publicar lo aprobado con revisor y fecha de revisión', () => {
    expect(canPublish(contenido({ status: 'approved' }))).toBe(true);
  });

  // RB-07 — sin rastro de aprobación clínica no se publica, pase lo que pase.
  it('no permite publicar sin revisor', () => {
    expect(canPublish(contenido({ status: 'approved', reviewerId: null }))).toBe(false);
  });

  it('no permite publicar sin fecha de revisión clínica', () => {
    expect(canPublish(contenido({ status: 'approved', clinicalReviewDate: null }))).toBe(false);
  });

  it('no permite publicar un borrador ni algo en revisión', () => {
    expect(canPublish(contenido({ status: 'draft' }))).toBe(false);
    expect(canPublish(contenido({ status: 'in_review' }))).toBe(false);
  });
});

describe('isVisibleToPatient', () => {
  it('el paciente ve lo publicado', () => {
    expect(isVisibleToPatient(contenido(), AHORA)).toBe(true);
  });

  it('el paciente no ve borradores, revisiones, aprobados ni retirados', () => {
    for (const status of ['draft', 'in_review', 'approved', 'retired'] as const) {
      expect(isVisibleToPatient(contenido({ status }), AHORA)).toBe(false);
    }
  });

  // RF-12 — "el contenido vencido podrá ocultarse".
  it('oculta el contenido cuya revisión clínica ya venció', () => {
    const viejo = contenido({ clinicalReviewDate: new Date('2020-01-01T00:00:00Z') });
    expect(isVisibleToPatient(viejo, AHORA)).toBe(false);
  });

  it('no muestra contenido publicado sin fecha de revisión', () => {
    expect(isVisibleToPatient(contenido({ clinicalReviewDate: null }), AHORA)).toBe(false);
  });
});

describe('isReviewStale', () => {
  it('una revisión reciente no está vencida', () => {
    expect(isReviewStale(new Date('2026-06-01T00:00:00Z'), AHORA)).toBe(false);
  });

  it('una revisión más antigua que el máximo está vencida', () => {
    expect(isReviewStale(new Date('2020-01-01T00:00:00Z'), AHORA)).toBe(true);
  });

  it('sin fecha de revisión se considera vencida', () => {
    expect(isReviewStale(null, AHORA)).toBe(true);
  });

  it('el plazo de vigencia está declarado', () => {
    expect(REVIEW_VALID_MONTHS).toBeGreaterThan(0);
  });
});

describe('CONTENT_CATEGORIES', () => {
  // RF-12 — las diez categorías iniciales del PRD.
  it('incluye las categorías iniciales del PRD', () => {
    const claves = CONTENT_CATEGORIES.map((c) => c.key);
    expect(claves).toContain('introduction');
    expect(claves).toContain('glucose');
    expect(claves).toContain('hba1c');
    expect(claves).toContain('when_to_seek_care');
    expect(CONTENT_CATEGORIES).toHaveLength(10);
  });
});

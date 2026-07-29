/**
 * Contenido educativo y su flujo editorial — RF-12, CA-09.
 *
 * El §RF-12 define el flujo: creación → revisión → aprobación clínica →
 * publicación → actualización → retiro. Y RB-07 lo cierra: "el contenido
 * médico no podrá publicarse sin aprobación".
 *
 * La consecuencia que este archivo hace cumplir, y que es fácil perder de
 * vista, es CA-09: editar contenido YA PUBLICADO lo devuelve a revisión. Si
 * editar no cambiara el estado, un editor podría publicar un texto revisado
 * y después reescribirlo entero sin que ningún profesional lo volviera a
 * mirar, dejando la aprobación clínica como un trámite de una sola vez.
 */

export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'retired';

/** §15 — matriz de permisos. */
export type Role = 'patient' | 'admin' | 'editor' | 'clinical_reviewer' | 'support' | 'analyst';

export interface ContentRecord {
  status: ContentStatus;
  reviewerId: string | null;
  clinicalReviewDate: Date | null;
  publishedAt: Date | null;
  version: number;
}

/** RF-12 — categorías iniciales del PRD, en su orden. */
export const CONTENT_CATEGORIES = [
  { key: 'introduction', labelEs: 'Introducción a la diabetes' },
  { key: 'glucose', labelEs: 'Glucosa' },
  { key: 'hba1c', labelEs: 'HbA1c' },
  { key: 'nutrition', labelEs: 'Alimentación' },
  { key: 'activity', labelEs: 'Actividad física' },
  { key: 'medications', labelEs: 'Medicamentos' },
  { key: 'weight', labelEs: 'Peso' },
  { key: 'blood_pressure', labelEs: 'Presión arterial' },
  { key: 'appointment_prep', labelEs: 'Preparación para consulta' },
  { key: 'when_to_seek_care', labelEs: 'Señales para solicitar atención' },
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]['key'];

/**
 * Vigencia de la revisión clínica. RF-12 pide registrar la fecha de revisión
 * y permite ocultar el contenido vencido; el plazo concreto lo debe fijar el
 * responsable clínico, y 24 meses es un valor de partida conservador.
 */
export const REVIEW_VALID_MONTHS = 24;

/* ──────────────────────────── Permisos ─────────────────────────────────── */

const PUEDEN_CREAR: readonly Role[] = ['admin', 'editor', 'clinical_reviewer'];

export function canCreate(role: Role): boolean {
  return PUEDEN_CREAR.includes(role);
}

/**
 * §15 — "Aprobar contenido clínico" es exclusivo del responsable clínico.
 * Ni siquiera el administrador general puede: RB-06 exige permisos
 * especiales para lo clínico.
 */
export function canApprove(role: Role): boolean {
  return role === 'clinical_reviewer';
}

/* ────────────────────────── Transiciones ───────────────────────────────── */

/** Transiciones permitidas por rol. Lo que no está aquí, no se puede. */
const TRANSICIONES: Record<ContentStatus, { to: ContentStatus; roles: readonly Role[] }[]> = {
  draft: [{ to: 'in_review', roles: ['admin', 'editor', 'clinical_reviewer'] }],

  in_review: [
    // Solo el responsable clínico aprueba o devuelve.
    { to: 'approved', roles: ['clinical_reviewer'] },
    { to: 'draft', roles: ['clinical_reviewer'] },
  ],

  approved: [
    { to: 'published', roles: ['admin', 'editor', 'clinical_reviewer'] },
    { to: 'draft', roles: ['clinical_reviewer'] },
  ],

  published: [{ to: 'retired', roles: ['admin', 'clinical_reviewer'] }],

  retired: [{ to: 'draft', roles: ['admin', 'editor', 'clinical_reviewer'] }],
};

export function canTransition(role: Role, from: ContentStatus, to: ContentStatus): boolean {
  return TRANSICIONES[from].some((t) => t.to === to && t.roles.includes(role));
}

/**
 * CA-09 — estado en el que queda el contenido tras editarlo.
 *
 * Editar algo aprobado o publicado invalida la aprobación anterior: el texto
 * ya no es el que revisó el profesional.
 */
export function statusAfterEdit(current: ContentStatus): ContentStatus {
  switch (current) {
    case 'approved':
    case 'published':
      return 'in_review';
    case 'retired':
      return 'draft';
    default:
      return current;
  }
}

/* ───────────────────────── Publicación y vigencia ──────────────────────── */

/**
 * RB-07 — publicar exige estado aprobado Y rastro de quién y cuándo lo
 * aprobó. Sin esos dos datos no hay aprobación que auditar.
 */
export function canPublish(content: ContentRecord): boolean {
  return (
    content.status === 'approved' &&
    content.reviewerId !== null &&
    content.clinicalReviewDate !== null
  );
}

export function isReviewStale(clinicalReviewDate: Date | null, now = new Date()): boolean {
  if (clinicalReviewDate === null) return true;

  const vence = new Date(clinicalReviewDate);
  vence.setMonth(vence.getMonth() + REVIEW_VALID_MONTHS);

  return now.getTime() > vence.getTime();
}

/** RF-12 — el paciente solo ve contenido publicado y con revisión vigente. */
export function isVisibleToPatient(content: ContentRecord, now = new Date()): boolean {
  return content.status === 'published' && !isReviewStale(content.clinicalReviewDate, now);
}

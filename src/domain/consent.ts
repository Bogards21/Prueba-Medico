/**
 * Consentimientos — RF-02, CA-02, CA-08.
 *
 * Dos reglas del PRD gobiernan este archivo:
 *
 *   "Cada consentimiento tendrá versión y fecha." → aceptar la v1 no cubre la
 *   v2. Si el documento cambia, el usuario vuelve a verlo. Por eso la
 *   comparación de versión es exacta y no un `>=`.
 *
 *   "Los consentimientos opcionales no podrán estar preseleccionados." → el
 *   catálogo lo declara en el dato (`defaultChecked: false`), no en la
 *   plantilla, para que ninguna pantalla pueda saltárselo por descuido.
 */

export type ConsentType =
  | 'terms'
  | 'privacy_notice'
  | 'data_processing'
  | 'communications'
  | 'aggregate_analytics';

export interface ConsentDocument {
  type: ConsentType;
  /** Fecha de publicación del documento, en ISO corta. */
  version: string;
  required: boolean;
  titleEs: string;
  summaryEs: string;
  /** Siempre `false` en los opcionales. Ver RF-02. */
  defaultChecked: boolean;
}

export interface ConsentRecord {
  consentType: ConsentType;
  documentVersion: string;
  accepted: boolean;
  revokedAt: Date | null;
}

/**
 * Catálogo vigente. Al publicar una versión nueva de un documento se cambia
 * aquí la `version`; el sistema volverá a pedirlo por sí solo.
 */
export const CONSENT_CATALOG: readonly ConsentDocument[] = [
  {
    type: 'terms',
    version: '2026-07-01',
    required: true,
    titleEs: 'Términos de uso',
    summaryEs:
      'Explican qué hace esta plataforma y qué no. No sustituye la atención médica profesional.',
    defaultChecked: false,
  },
  {
    type: 'privacy_notice',
    version: '2026-07-01',
    required: true,
    titleEs: 'Aviso de privacidad',
    summaryEs: 'Explica qué datos guardamos, para qué y durante cuánto tiempo.',
    defaultChecked: false,
  },
  {
    type: 'data_processing',
    version: '2026-07-01',
    required: true,
    titleEs: 'Tratamiento de tus datos de salud',
    summaryEs:
      'Autorizas que guardemos tus mediciones para mostrarte tu historial y tus tendencias.',
    defaultChecked: false,
  },
  {
    type: 'communications',
    version: '2026-07-01',
    required: false,
    titleEs: 'Recordatorios y avisos por correo',
    summaryEs: 'Podemos escribirte para recordarte tus mediciones y tus medicamentos.',
    defaultChecked: false,
  },
  {
    type: 'aggregate_analytics',
    version: '2026-07-01',
    required: false,
    titleEs: 'Uso de datos de forma agregada',
    summaryEs:
      'Autorizas usar tus datos sin identificarte, junto con los de otras personas, para mejorar la plataforma.',
    defaultChecked: false,
  },
] as const;

/**
 * Un documento está satisfecho solo si existe una aceptación de ESA versión,
 * con `accepted` verdadero y sin revocar.
 */
export function isSatisfied(doc: ConsentDocument, records: ConsentRecord[]): boolean {
  return records.some(
    (r) =>
      r.consentType === doc.type &&
      r.documentVersion === doc.version &&
      r.accepted &&
      r.revokedAt === null,
  );
}

/** Documentos obligatorios que el usuario todavía debe aceptar (CA-02). */
export function pendingRequired(records: ConsentRecord[]): ConsentDocument[] {
  return CONSENT_CATALOG.filter((d) => d.required && !isSatisfied(d, records));
}

export function optionalDocuments(): ConsentDocument[] {
  return CONSENT_CATALOG.filter((d) => !d.required);
}

/** Opcionales vigentes, para saber qué usos están autorizados hoy (CA-08). */
export function grantedOptional(records: ConsentRecord[]): ConsentType[] {
  return optionalDocuments()
    .filter((d) => isSatisfied(d, records))
    .map((d) => d.type);
}

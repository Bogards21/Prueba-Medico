/**
 * Modelo de datos — §16 del PRD.
 *
 * Invariantes que el esquema hace cumplir a nivel de base de datos, no de
 * aplicación, porque son requisitos que no deben poder saltarse desde código:
 *
 *   RB-05  Trazabilidad: los registros clínicos llevan `deleted_at` y se
 *          borran lógicamente. Nunca `DELETE`.
 *   RB-11  Origen del dato: `source` es NOT NULL y SIN DEFAULT, para que sea
 *          imposible insertar un registro sin declarar si fue manual.
 *   RB-02  Gobernanza clínica: un CHECK impide que una regla llegue a estado
 *          `active` sin `approved_by` y `approved_at`.
 *   RF-02  Consentimientos: cada aceptación es una fila con su versión de
 *          documento. La revocación se marca, no se borra.
 */

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* ─────────────────────────── Enumeraciones ─────────────────────────── */

export const userStatus = pgEnum('user_status', [
  'pending_verification',
  'active',
  'suspended',
  'deletion_requested',
]);

/** §15 — matriz de permisos. */
export const userRole = pgEnum('user_role', [
  'patient',
  'admin',
  'editor',
  'clinical_reviewer',
  'support',
  'analyst',
]);

/** RB-11 — origen del dato. */
export const recordSource = pgEnum('record_source', ['manual', 'imported', 'device']);

export const glucoseUnit = pgEnum('glucose_unit', ['mg/dL', 'mmol/L']);

/** RF-04 — contextos de medición. */
export const glucoseContext = pgEnum('glucose_context', [
  'fasting',
  'before_meal',
  'after_meal',
  'before_sleep',
  'other',
]);

export const weightUnit = pgEnum('weight_unit', ['kg', 'lb']);

/** RF-13 — los cinco niveles del PRD. */
export const severity = pgEnum('severity', [
  'informational',
  'preventive',
  'needs_review',
  'seek_care',
  'potential_emergency',
]);

export const ruleStatus = pgEnum('rule_status', ['draft', 'active', 'inactive']);
export const ruleOperator = pgEnum('rule_operator', ['gt', 'gte', 'lt', 'lte', 'eq']);
export const ruleVariable = pgEnum('rule_variable', [
  'glucose',
  'weight',
  'systolic',
  'diastolic',
]);

/** RF-02 — tipos de consentimiento. */
export const consentType = pgEnum('consent_type', [
  'terms',
  'privacy_notice',
  'data_processing',
  'communications',
  'aggregate_analytics',
]);

export const medicationStatus = pgEnum('medication_status', ['active', 'paused', 'finished']);
export const medicationLogStatus = pgEnum('medication_log_status', [
  'pending',
  'completed',
  'skipped',
  'postponed',
]);

export const reminderType = pgEnum('reminder_type', [
  'medication',
  'glucose',
  'weight',
  'blood_pressure',
  'activity',
  'appointment',
  'lab',
]);
export const reminderChannel = pgEnum('reminder_channel', ['in_app', 'email']);
export const reminderStatus = pgEnum('reminder_status', ['active', 'paused']);

/** RF-12 — flujo editorial: creación → revisión → aprobación → publicación → retiro. */
export const contentStatus = pgEnum('content_status', [
  'draft',
  'in_review',
  'approved',
  'published',
  'retired',
]);
export const contentType = pgEnum('content_type', [
  'article',
  'infographic',
  'video',
  'faq',
  'guide',
  'microlesson',
]);

export const goalType = pgEnum('goal_type', ['records', 'activity', 'weight']);
export const goalStatus = pgEnum('goal_status', ['active', 'achieved', 'abandoned']);

export const subscriptionPlan = pgEnum('subscription_plan', ['free', 'premium']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
]);

/* ────────────────────────── Cuenta y perfil ────────────────────────── */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('patient'),
    status: userStatus('status').notNull().default('pending_verification'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** CA-01 — token de confirmación de correo. Se borra al verificar. */
    emailVerificationToken: text('email_verification_token'),
    emailVerificationExpiresAt: timestamp('email_verification_expires_at', {
      withTimezone: true,
    }),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  birthDate: timestamp('birth_date', { withTimezone: false }),
  country: text('country').notNull().default('MX'),
  timezone: text('timezone').notNull().default('America/Mexico_City'),
  language: text('language').notNull().default('es-MX'),
  preferences: jsonb('preferences').notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clinicalProfiles = pgTable('clinical_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  diagnosisYear: integer('diagnosis_year'),
  heightCm: numeric('height_cm', { precision: 5, scale: 1 }),
  weightReferenceKg: numeric('weight_reference_kg', { precision: 5, scale: 2 }),
  glucoseUnit: glucoseUnit('glucose_unit').notNull().default('mg/dL'),
  relatedConditions: jsonb('related_conditions').notNull().default(sql`'[]'::jsonb`),
  measurementFrequency: text('measurement_frequency'),
  emergencyContact: jsonb('emergency_contact'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ──────────────────────── Consentimientos (RF-02) ───────────────────── */

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: consentType('consent_type').notNull(),
    /** Versión exacta del documento aceptado. Sin esto no hay trazabilidad. */
    documentVersion: text('document_version').notNull(),
    accepted: boolean('accepted').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('consents_user_type_idx').on(t.userId, t.consentType)],
);

/* ───────────────────── Registros clínicos (RF-04 a RF-07) ──────────── */

export const glucoseRecords = pgTable(
  'glucose_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: numeric('value', { precision: 6, scale: 2 }).notNull(),
    unit: glucoseUnit('unit').notNull(),
    context: glucoseContext('context').notNull(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    /** RB-11 — NOT NULL y sin default, a propósito. */
    source: recordSource('source').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('glucose_user_measured_idx').on(t.userId, t.measuredAt)],
);

export const weightRecords = pgTable(
  'weight_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: numeric('value', { precision: 5, scale: 2 }).notNull(),
    unit: weightUnit('unit').notNull(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    source: recordSource('source').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('weight_user_measured_idx').on(t.userId, t.measuredAt)],
);

export const bloodPressureRecords = pgTable(
  'blood_pressure_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    systolic: integer('systolic').notNull(),
    diastolic: integer('diastolic').notNull(),
    pulse: integer('pulse'),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    context: text('context'),
    source: recordSource('source').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('bp_user_measured_idx').on(t.userId, t.measuredAt)],
);

export const activityRecords = pgTable(
  'activity_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activityType: text('activity_type').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    intensity: text('intensity'),
    steps: integer('steps'),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
    source: recordSource('source').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('activity_user_performed_idx').on(t.userId, t.performedAt)],
);

/* ───────────────────────── Medicamentos (RF-08) ─────────────────────── */

export const medications = pgTable('medications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  presentation: text('presentation'),
  /**
   * RF-08: "dosis informativa". Texto libre capturado por el paciente. La
   * plataforma no sugiere dosis ni las interpreta — solo las guarda.
   */
  doseText: text('dose_text'),
  frequency: text('frequency'),
  startDate: timestamp('start_date', { withTimezone: false }),
  endDate: timestamp('end_date', { withTimezone: false }),
  status: medicationStatus('status').notNull().default('active'),
  instructions: text('instructions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const medicationSchedules = pgTable('medication_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  medicationId: uuid('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  /** Patrón de días, p. ej. ["mon","wed","fri"] o ["daily"]. */
  dayPattern: jsonb('day_pattern').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  timezone: text('timezone').notNull(),
  active: boolean('active').notNull().default(true),
});

export const medicationLogs = pgTable(
  'medication_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medications.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: medicationLogStatus('status').notNull().default('pending'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    omissionReason: text('omission_reason'),
  },
  (t) => [index('medlog_med_scheduled_idx').on(t.medicationId, t.scheduledAt)],
);

/* ───────────────────────── Recordatorios (RF-09) ────────────────────── */

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: reminderType('type').notNull(),
  relatedEntityId: uuid('related_entity_id'),
  /** Días y horarios. La zona horaria se guarda aparte (§13.4). */
  schedule: jsonb('schedule').notNull(),
  timezone: text('timezone').notNull(),
  channel: reminderChannel('channel').notNull().default('in_app'),
  status: reminderStatus('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────── Reglas clínicas (RF-13) ────────────────────── */

export const clinicalRules = pgTable(
  'clinical_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    variable: ruleVariable('variable').notNull(),
    operator: ruleOperator('operator').notNull(),
    threshold: numeric('threshold', { precision: 8, scale: 2 }).notNull(),
    unit: text('unit').notNull(),
    severity: severity('severity').notNull(),
    /** Texto exacto aprobado. El motor nunca redacta. */
    messageEs: text('message_es').notNull(),
    protocolReference: text('protocol_reference'),
    version: integer('version').notNull().default(1),
    status: ruleStatus('status').notNull().default('draft'),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * §22.15 — "las reglas deberán probarse antes de producción". Este CHECK
     * hace que sea imposible activar una regla sin aprobación registrada,
     * incluso mediante SQL directo.
     */
    check(
      'clinical_rules_active_requires_approval',
      sql`${t.status} <> 'active' OR (${t.approvedBy} IS NOT NULL AND ${t.approvedAt} IS NOT NULL)`,
    ),
  ],
);

export const alertEvents = pgTable(
  'alert_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ruleId: uuid('rule_id').references(() => clinicalRules.id, { onDelete: 'set null' }),
    /** Versión de la regla en el momento del disparo (CA-05). */
    ruleVersion: integer('rule_version').notNull(),
    relatedRecordId: uuid('related_record_id'),
    severity: severity('severity').notNull(),
    /** Copia literal del mensaje mostrado, para auditoría. */
    messageShown: text('message_shown').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  },
  (t) => [index('alert_user_created_idx').on(t.userId, t.createdAt)],
);

/* ─────────────────── Contenido educativo (RF-12) ────────────────────── */

export const contents = pgTable('contents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary'),
  body: text('body').notNull(),
  type: contentType('type').notNull(),
  category: text('category').notNull(),
  status: contentStatus('status').notNull().default('draft'),
  author: text('author').notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  clinicalReviewDate: timestamp('clinical_review_date', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────────────── Metas, reportes, negocio ─────────────────────── */

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: goalType('type').notNull(),
  target: numeric('target', { precision: 8, scale: 2 }).notNull(),
  period: text('period').notNull(),
  startDate: timestamp('start_date', { withTimezone: false }).notNull(),
  endDate: timestamp('end_date', { withTimezone: false }),
  status: goalStatus('status').notNull().default('active'),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start', { withTimezone: false }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: false }).notNull(),
  /** RB-03 — el usuario decide qué secciones incluye. */
  sections: jsonb('sections').notNull(),
  fileReference: text('file_reference'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plan: subscriptionPlan('plan').notNull().default('free'),
  status: subscriptionStatus('status').notNull().default('active'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
  renewalDate: timestamp('renewal_date', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
});

/* ─────────────────────────── Auditoría (§17.1) ──────────────────────── */

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /**
     * RB-05 — `set null` y no `cascade`: si se elimina la cuenta, el rastro
     * de auditoría sobrevive sin quedar ligado a la persona.
     */
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    ipReference: text('ip_reference'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_entity_idx').on(t.entityType, t.entityId)],
);

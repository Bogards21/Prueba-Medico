CREATE TYPE "public"."consent_type" AS ENUM('terms', 'privacy_notice', 'data_processing', 'communications', 'aggregate_analytics');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('article', 'infographic', 'video', 'faq', 'guide', 'microlesson');--> statement-breakpoint
CREATE TYPE "public"."glucose_context" AS ENUM('fasting', 'before_meal', 'after_meal', 'before_sleep', 'other');--> statement-breakpoint
CREATE TYPE "public"."glucose_unit" AS ENUM('mg/dL', 'mmol/L');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('records', 'activity', 'weight');--> statement-breakpoint
CREATE TYPE "public"."medication_log_status" AS ENUM('pending', 'completed', 'skipped', 'postponed');--> statement-breakpoint
CREATE TYPE "public"."medication_status" AS ENUM('active', 'paused', 'finished');--> statement-breakpoint
CREATE TYPE "public"."record_source" AS ENUM('manual', 'imported', 'device');--> statement-breakpoint
CREATE TYPE "public"."reminder_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('medication', 'glucose', 'weight', 'blood_pressure', 'activity', 'appointment', 'lab');--> statement-breakpoint
CREATE TYPE "public"."rule_operator" AS ENUM('gt', 'gte', 'lt', 'lte', 'eq');--> statement-breakpoint
CREATE TYPE "public"."rule_status" AS ENUM('draft', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."rule_variable" AS ENUM('glucose', 'weight', 'systolic', 'diastolic');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('informational', 'preventive', 'needs_review', 'seek_care', 'potential_emergency');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'admin', 'editor', 'clinical_reviewer', 'support', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending_verification', 'active', 'suspended', 'deletion_requested');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "activity_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"intensity" text,
	"steps" integer,
	"performed_at" timestamp with time zone NOT NULL,
	"source" "record_source" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_id" uuid,
	"rule_version" integer NOT NULL,
	"related_record_id" uuid,
	"severity" "severity" NOT NULL,
	"message_shown" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blood_pressure_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"systolic" integer NOT NULL,
	"diastolic" integer NOT NULL,
	"pulse" integer,
	"measured_at" timestamp with time zone NOT NULL,
	"context" text,
	"source" "record_source" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clinical_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"diagnosis_year" integer,
	"height_cm" numeric(5, 1),
	"weight_reference_kg" numeric(5, 2),
	"glucose_unit" "glucose_unit" DEFAULT 'mg/dL' NOT NULL,
	"related_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"measurement_frequency" text,
	"emergency_contact" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "clinical_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"variable" "rule_variable" NOT NULL,
	"operator" "rule_operator" NOT NULL,
	"threshold" numeric(8, 2) NOT NULL,
	"unit" text NOT NULL,
	"severity" "severity" NOT NULL,
	"message_es" text NOT NULL,
	"protocol_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "rule_status" DEFAULT 'draft' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_rules_active_requires_approval" CHECK ("clinical_rules"."status" <> 'active' OR ("clinical_rules"."approved_by" IS NOT NULL AND "clinical_rules"."approved_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"document_version" text NOT NULL,
	"accepted" boolean NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"type" "content_type" NOT NULL,
	"category" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"author" text NOT NULL,
	"reviewer_id" uuid,
	"clinical_review_date" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "glucose_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"value" numeric(6, 2) NOT NULL,
	"unit" "glucose_unit" NOT NULL,
	"context" "glucose_context" NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"source" "record_source" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "goal_type" NOT NULL,
	"target" numeric(8, 2) NOT NULL,
	"period" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" "goal_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "medication_log_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"omission_reason" text
);
--> statement-breakpoint
CREATE TABLE "medication_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"day_pattern" jsonb NOT NULL,
	"scheduled_time" text NOT NULL,
	"timezone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"presentation" text,
	"dose_text" text,
	"frequency" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "medication_status" DEFAULT 'active' NOT NULL,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text,
	"last_name" text,
	"birth_date" timestamp,
	"country" text DEFAULT 'MX' NOT NULL,
	"timezone" text DEFAULT 'America/Mexico_City' NOT NULL,
	"language" text DEFAULT 'es-MX' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "reminder_type" NOT NULL,
	"related_entity_id" uuid,
	"schedule" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"channel" "reminder_channel" DEFAULT 'in_app' NOT NULL,
	"status" "reminder_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"sections" jsonb NOT NULL,
	"file_reference" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"renewal_date" timestamp with time zone,
	"canceled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'patient' NOT NULL,
	"status" "user_status" DEFAULT 'pending_verification' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	"unit" "weight_unit" NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"source" "record_source" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_records" ADD CONSTRAINT "activity_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_clinical_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."clinical_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_pressure_records" ADD CONSTRAINT "blood_pressure_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_profiles" ADD CONSTRAINT "clinical_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_records" ADD CONSTRAINT "glucose_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_performed_idx" ON "activity_records" USING btree ("user_id","performed_at");--> statement-breakpoint
CREATE INDEX "alert_user_created_idx" ON "alert_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "bp_user_measured_idx" ON "blood_pressure_records" USING btree ("user_id","measured_at");--> statement-breakpoint
CREATE INDEX "consents_user_type_idx" ON "consents" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE INDEX "glucose_user_measured_idx" ON "glucose_records" USING btree ("user_id","measured_at");--> statement-breakpoint
CREATE INDEX "medlog_med_scheduled_idx" ON "medication_logs" USING btree ("medication_id","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "weight_user_measured_idx" ON "weight_records" USING btree ("user_id","measured_at");
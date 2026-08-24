CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"player_id" text NOT NULL,
	"mark" text NOT NULL,
	"attended_on" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"camp_name" text NOT NULL,
	"player_id" text NOT NULL,
	"booking_option" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"payment_method" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"venue" text NOT NULL,
	"time" text NOT NULL,
	"capacity" integer NOT NULL,
	"day_price_pence" integer NOT NULL,
	"full_price_pence" integer NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"campaign_id" text DEFAULT '' NOT NULL,
	"customer_id" text DEFAULT '' NOT NULL,
	"player_id" text DEFAULT '' NOT NULL,
	"programme_id" text DEFAULT '' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"recipient" text NOT NULL,
	"intended_recipient" text NOT NULL,
	"subject" text NOT NULL,
	"message_type" text NOT NULL,
	"related_invoice_id" integer,
	"attachment_name" text DEFAULT '' NOT NULL,
	"sending_account" text NOT NULL,
	"delivery_mode" text NOT NULL,
	"send_status" text NOT NULL,
	"provider_message_id" text DEFAULT '' NOT NULL,
	"failure_reason" text DEFAULT '' NOT NULL,
	"sent_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"operational_email_eligible" boolean DEFAULT true NOT NULL,
	"marketing_email_opt_in" boolean DEFAULT false NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"player" text NOT NULL,
	"payer" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"programme" text NOT NULL,
	"balance" text NOT NULL,
	"payment" text NOT NULL,
	"status" text NOT NULL,
	"medical" text NOT NULL,
	"emergency" text DEFAULT '' NOT NULL,
	"consent" text DEFAULT 'Pending' NOT NULL,
	"date_of_birth" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"provider" text NOT NULL,
	"connected_email" text DEFAULT '' NOT NULL,
	"encrypted_access_token" text DEFAULT '' NOT NULL,
	"encrypted_refresh_token" text DEFAULT '' NOT NULL,
	"token_expires_at" text DEFAULT '' NOT NULL,
	"connection_status" text DEFAULT 'Not connected' NOT NULL,
	"scopes" text DEFAULT '' NOT NULL,
	"oauth_state" text DEFAULT '' NOT NULL,
	"connected_at" text DEFAULT '' NOT NULL,
	"last_successful_use" text DEFAULT '' NOT NULL,
	"last_failure_category" text DEFAULT '' NOT NULL,
	"active_for_sending" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"message_type" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" serial PRIMARY KEY NOT NULL,
	"programme_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"term_id" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"trial_sessions_allowed" integer DEFAULT 0 NOT NULL,
	"trial_sessions_completed" integer DEFAULT 0 NOT NULL,
	"trial_status" text DEFAULT '' NOT NULL,
	"next_trial_session" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"player_id" text NOT NULL,
	"payer_id" text NOT NULL,
	"intended_recipient" text NOT NULL,
	"actual_recipient" text NOT NULL,
	"sending_account" text NOT NULL,
	"send_status" text NOT NULL,
	"sent_at" text NOT NULL,
	"gmail_message_id" text DEFAULT '' NOT NULL,
	"pdf_attached" boolean DEFAULT false NOT NULL,
	"failure_reason" text DEFAULT '' NOT NULL,
	"delivery_mode" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_pence" integer NOT NULL,
	"total_pence" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"programme_id" text NOT NULL,
	"term_id" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"status" text NOT NULL,
	"due_date" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"email_status" text DEFAULT 'Draft' NOT NULL,
	"payment_status" text DEFAULT 'Outstanding' NOT NULL,
	"pdf_ref" text DEFAULT '' NOT NULL,
	"sent_at" text,
	"lifecycle_status" text DEFAULT 'Active' NOT NULL,
	"active_billing_key" text,
	"replaced_by_invoice_id" integer,
	"void_reason" text DEFAULT '' NOT NULL,
	"voided_at" text,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer,
	"customer_id" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"method" text NOT NULL,
	"status" text NOT NULL,
	"reference" text NOT NULL,
	"paid_at" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_register_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"register_id" integer NOT NULL,
	"player_id" text NOT NULL,
	"mark" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"marked_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_registers" (
	"id" serial PRIMARY KEY NOT NULL,
	"programme_id" text NOT NULL,
	"term_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"session_date" text NOT NULL,
	"status" text DEFAULT 'Not started' NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weekday" integer NOT NULL,
	"type" text DEFAULT 'Junior course' NOT NULL,
	"start_time" text NOT NULL,
	"venue" text NOT NULL,
	"coach" text NOT NULL,
	"capacity" integer NOT NULL,
	"price_pence" integer NOT NULL,
	"tone" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"min_age_years" integer DEFAULT 0 NOT NULL,
	"max_age_years" integer DEFAULT 99 NOT NULL,
	"suggested_next_programme_id" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollover_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"rollover_id" integer NOT NULL,
	"enrolment_id" integer NOT NULL,
	"customer_id" text NOT NULL,
	"current_programme_id" text NOT NULL,
	"next_programme_id" text NOT NULL,
	"continuation_status" text DEFAULT 'Awaiting Confirmation' NOT NULL,
	"progression_status" text DEFAULT 'Not Required' NOT NULL,
	"progression_reason" text DEFAULT '' NOT NULL,
	"age_at_next_term_months" integer,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" integer NOT NULL,
	"start" text NOT NULL,
	"title" text NOT NULL,
	"meta" text NOT NULL,
	"venue" text NOT NULL,
	"coach" text NOT NULL,
	"tone" text NOT NULL,
	"term_id" text NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"session_date" text DEFAULT '2026-08-19' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"qualifications" text DEFAULT '' NOT NULL,
	"safeguarding" text DEFAULT '' NOT NULL,
	"employment_status" text DEFAULT 'Contractor' NOT NULL,
	"pay_rate_pence" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_email" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'Owner' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"last_signed_in_at" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "term_rollovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"current_term_id" text NOT NULL,
	"next_term_id" text NOT NULL,
	"status" text DEFAULT 'Prepared' NOT NULL,
	"prepared_at" text NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"session_count" integer NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"courts" integer NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_session_player_idx" ON "attendance" USING btree ("session_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "communication_preference_idx" ON "communication_preferences" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_connection_tenant_provider_idx" ON "email_connections" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "email_template_name_idx" ON "email_templates" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "enrolment_programme_customer_term_idx" ON "enrolments" USING btree ("programme_id","customer_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_active_billing_key_idx" ON "invoices" USING btree ("active_billing_key");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_register_player_idx" ON "programme_register_marks" USING btree ("register_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_register_week_idx" ON "programme_registers" USING btree ("programme_id","term_id","week_number");--> statement-breakpoint
CREATE UNIQUE INDEX "rollover_enrolment_idx" ON "rollover_decisions" USING btree ("rollover_id","enrolment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_membership_idx" ON "tenant_memberships" USING btree ("tenant_id","user_email");--> statement-breakpoint
CREATE UNIQUE INDEX "term_rollover_pair_idx" ON "term_rollovers" USING btree ("current_term_id","next_term_id");

-- The exact current application uses authenticated server routes for all
-- operational data access. Block direct browser/Data API access to every
-- application table. The server's Postgres role retains its normal access.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'attendance', 'camp_bookings', 'camps', 'communication_messages',
    'communication_preferences', 'customers', 'email_connections',
    'email_outbox', 'email_templates', 'enrolments', 'invoice_email_logs',
    'invoice_items', 'invoices', 'payments', 'programme_register_marks',
    'programme_registers', 'programmes', 'rollover_decisions', 'sessions',
    'settings', 'staff', 'tenant_memberships', 'tenants', 'term_rollovers',
    'terms', 'venues'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

revoke all on all sequences in schema public from anon, authenticated;

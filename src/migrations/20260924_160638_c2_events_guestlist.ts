import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_events_extra_fields_type" AS ENUM('text', 'textarea', 'select', 'checkbox');
  CREATE TYPE "payload"."enum_events_status" AS ENUM('draft', 'open', 'closed', 'cancelled');
  CREATE TYPE "payload"."enum_form_templates_extra_fields_type" AS ENUM('text', 'textarea', 'select', 'checkbox');
  CREATE TYPE "payload"."enum_guestlist_status" AS ENUM('invited', 'registered', 'cancelled');
  CREATE TYPE "payload"."enum_guestlist_source" AS ENUM('guestlist', 'shared-link', 'manual');
  CREATE TYPE "payload"."enum_guestlist_last_invite_status" AS ENUM('queued', 'sent', 'delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed');
  CREATE TYPE "payload"."enum_guestlist_last_email_status" AS ENUM('queued', 'sent', 'delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed');
  CREATE TYPE "payload"."enum_messages_audience" AS ENUM('all-guestlist', 'not-yet-registered', 'registered');
  CREATE TYPE "payload"."enum_messages_calendar" AS ENUM('none', 'invite', 'update', 'cancel');
  CREATE TYPE "payload"."enum_messages_status" AS ENUM('draft', 'sending', 'sent', 'partial');
  CREATE TYPE "payload"."enum_deliveries_kind" AS ENUM('confirmation', 'bulk', 'invite', 'update', 'cancel');
  CREATE TYPE "payload"."enum_deliveries_status" AS ENUM('queued', 'sent', 'delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed');
  CREATE TABLE "payload"."events_extra_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "payload"."enum_events_extra_fields_type" DEFAULT 'text' NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "payload"."enum_events_status" DEFAULT 'draft' NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"venue_name" varchar NOT NULL,
  	"map_url" varchar,
  	"venue_address" varchar,
  	"description" jsonb,
  	"open_registration" boolean DEFAULT true,
  	"capacity" numeric,
  	"registration_closes" timestamp(3) with time zone,
  	"apply_template_id" integer,
  	"host_user_id" integer,
  	"reply_to_email" varchar,
  	"confirmation_note" varchar,
  	"calendar_sequence" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."events_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."form_templates_extra_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "payload"."enum_form_templates_extra_fields_type" DEFAULT 'text' NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."form_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."form_templates_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."guestlist" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"person_id" integer NOT NULL,
  	"status" "payload"."enum_guestlist_status" DEFAULT 'invited' NOT NULL,
  	"source" "payload"."enum_guestlist_source" DEFAULT 'manual' NOT NULL,
  	"registered_at" timestamp(3) with time zone,
  	"responses" jsonb,
  	"token" varchar,
  	"last_invite_status" "payload"."enum_guestlist_last_invite_status",
  	"last_email_status" "payload"."enum_guestlist_last_email_status",
  	"last_email_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"subject" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"audience" "payload"."enum_messages_audience" DEFAULT 'all-guestlist' NOT NULL,
  	"calendar" "payload"."enum_messages_calendar" DEFAULT 'none' NOT NULL,
  	"status" "payload"."enum_messages_status" DEFAULT 'draft' NOT NULL,
  	"sender_id" integer,
  	"sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"guestlist_entry_id" integer,
  	"message_id" integer,
  	"to_email" varchar NOT NULL,
  	"kind" "payload"."enum_deliveries_kind" NOT NULL,
  	"status" "payload"."enum_deliveries_status" DEFAULT 'queued' NOT NULL,
  	"provider_message_id" varchar,
  	"error" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"status_updated_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "form_templates_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "guestlist_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "messages_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "deliveries_id" integer;
  ALTER TABLE "payload"."events_extra_fields" ADD CONSTRAINT "events_extra_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."events" ADD CONSTRAINT "events_apply_template_id_form_templates_id_fk" FOREIGN KEY ("apply_template_id") REFERENCES "payload"."form_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."events" ADD CONSTRAINT "events_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."events_texts" ADD CONSTRAINT "events_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."form_templates_extra_fields" ADD CONSTRAINT "form_templates_extra_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."form_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."form_templates_texts" ADD CONSTRAINT "form_templates_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."form_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."guestlist" ADD CONSTRAINT "guestlist_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "payload"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."guestlist" ADD CONSTRAINT "guestlist_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "payload"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."messages" ADD CONSTRAINT "messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "payload"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."deliveries" ADD CONSTRAINT "deliveries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "payload"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."deliveries" ADD CONSTRAINT "deliveries_guestlist_entry_id_guestlist_id_fk" FOREIGN KEY ("guestlist_entry_id") REFERENCES "payload"."guestlist"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."deliveries" ADD CONSTRAINT "deliveries_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "payload"."messages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_extra_fields_order_idx" ON "payload"."events_extra_fields" USING btree ("_order");
  CREATE INDEX "events_extra_fields_parent_id_idx" ON "payload"."events_extra_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "payload"."events" USING btree ("slug");
  CREATE INDEX "events_apply_template_idx" ON "payload"."events" USING btree ("apply_template_id");
  CREATE INDEX "events_host_user_idx" ON "payload"."events" USING btree ("host_user_id");
  CREATE INDEX "events_updated_at_idx" ON "payload"."events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "payload"."events" USING btree ("created_at");
  CREATE INDEX "events_texts_order_parent" ON "payload"."events_texts" USING btree ("order","parent_id");
  CREATE INDEX "form_templates_extra_fields_order_idx" ON "payload"."form_templates_extra_fields" USING btree ("_order");
  CREATE INDEX "form_templates_extra_fields_parent_id_idx" ON "payload"."form_templates_extra_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "form_templates_name_idx" ON "payload"."form_templates" USING btree ("name");
  CREATE INDEX "form_templates_updated_at_idx" ON "payload"."form_templates" USING btree ("updated_at");
  CREATE INDEX "form_templates_created_at_idx" ON "payload"."form_templates" USING btree ("created_at");
  CREATE INDEX "form_templates_texts_order_parent" ON "payload"."form_templates_texts" USING btree ("order","parent_id");
  CREATE INDEX "guestlist_event_idx" ON "payload"."guestlist" USING btree ("event_id");
  CREATE INDEX "guestlist_person_idx" ON "payload"."guestlist" USING btree ("person_id");
  CREATE INDEX "guestlist_status_idx" ON "payload"."guestlist" USING btree ("status");
  CREATE INDEX "guestlist_source_idx" ON "payload"."guestlist" USING btree ("source");
  CREATE UNIQUE INDEX "guestlist_token_idx" ON "payload"."guestlist" USING btree ("token");
  CREATE INDEX "guestlist_last_invite_status_idx" ON "payload"."guestlist" USING btree ("last_invite_status");
  CREATE INDEX "guestlist_last_email_status_idx" ON "payload"."guestlist" USING btree ("last_email_status");
  CREATE INDEX "guestlist_updated_at_idx" ON "payload"."guestlist" USING btree ("updated_at");
  CREATE INDEX "guestlist_created_at_idx" ON "payload"."guestlist" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_person_idx" ON "payload"."guestlist" USING btree ("event_id","person_id");
  CREATE INDEX "messages_event_idx" ON "payload"."messages" USING btree ("event_id");
  CREATE INDEX "messages_status_idx" ON "payload"."messages" USING btree ("status");
  CREATE INDEX "messages_sender_idx" ON "payload"."messages" USING btree ("sender_id");
  CREATE INDEX "messages_updated_at_idx" ON "payload"."messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "payload"."messages" USING btree ("created_at");
  CREATE INDEX "deliveries_event_idx" ON "payload"."deliveries" USING btree ("event_id");
  CREATE INDEX "deliveries_guestlist_entry_idx" ON "payload"."deliveries" USING btree ("guestlist_entry_id");
  CREATE INDEX "deliveries_message_idx" ON "payload"."deliveries" USING btree ("message_id");
  CREATE INDEX "deliveries_status_idx" ON "payload"."deliveries" USING btree ("status");
  CREATE INDEX "deliveries_provider_message_id_idx" ON "payload"."deliveries" USING btree ("provider_message_id");
  CREATE INDEX "deliveries_updated_at_idx" ON "payload"."deliveries" USING btree ("updated_at");
  CREATE INDEX "deliveries_created_at_idx" ON "payload"."deliveries" USING btree ("created_at");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_templates_fk" FOREIGN KEY ("form_templates_id") REFERENCES "payload"."form_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guestlist_fk" FOREIGN KEY ("guestlist_id") REFERENCES "payload"."guestlist"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "payload"."messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_deliveries_fk" FOREIGN KEY ("deliveries_id") REFERENCES "payload"."deliveries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_form_templates_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("form_templates_id");
  CREATE INDEX "payload_locked_documents_rels_guestlist_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("guestlist_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("messages_id");
  CREATE INDEX "payload_locked_documents_rels_deliveries_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("deliveries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."events_extra_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."events_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."form_templates_extra_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."form_templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."form_templates_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."guestlist" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."deliveries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."events_extra_fields" CASCADE;
  DROP TABLE "payload"."events" CASCADE;
  DROP TABLE "payload"."events_texts" CASCADE;
  DROP TABLE "payload"."form_templates_extra_fields" CASCADE;
  DROP TABLE "payload"."form_templates" CASCADE;
  DROP TABLE "payload"."form_templates_texts" CASCADE;
  DROP TABLE "payload"."guestlist" CASCADE;
  DROP TABLE "payload"."messages" CASCADE;
  DROP TABLE "payload"."deliveries" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_templates_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_guestlist_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_messages_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_deliveries_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_form_templates_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_guestlist_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_messages_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_deliveries_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "form_templates_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "guestlist_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "messages_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "deliveries_id";
  DROP TYPE "payload"."enum_events_extra_fields_type";
  DROP TYPE "payload"."enum_events_status";
  DROP TYPE "payload"."enum_form_templates_extra_fields_type";
  DROP TYPE "payload"."enum_guestlist_status";
  DROP TYPE "payload"."enum_guestlist_source";
  DROP TYPE "payload"."enum_guestlist_last_invite_status";
  DROP TYPE "payload"."enum_guestlist_last_email_status";
  DROP TYPE "payload"."enum_messages_audience";
  DROP TYPE "payload"."enum_messages_calendar";
  DROP TYPE "payload"."enum_messages_status";
  DROP TYPE "payload"."enum_deliveries_kind";
  DROP TYPE "payload"."enum_deliveries_status";`)
}

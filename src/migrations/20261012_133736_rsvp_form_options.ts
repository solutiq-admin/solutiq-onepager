import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedFormOptions } from '../lib/events/rsvp-seed'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_form_options_list" AS ENUM('salutation', 'industry', 'attendance-goal');
  CREATE TABLE "payload"."form_options" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"list" "payload"."enum_form_options_list" NOT NULL,
  	"sort_order" numeric DEFAULT 100 NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."guestlist_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."guestlist_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"form_options_id" integer
  );
  
  ALTER TABLE "payload"."guestlist" ADD COLUMN "salutation_option_id" integer;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "salutation" varchar;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "first_name" varchar;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "last_name" varchar;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "job_title" varchar;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "organisation" varchar;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "industry_option_id" integer;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "industry" varchar;
  ALTER TABLE "payload"."people" ADD COLUMN "salutation_option_id" integer;
  ALTER TABLE "payload"."people" ADD COLUMN "salutation" varchar;
  ALTER TABLE "payload"."people" ADD COLUMN "first_name" varchar;
  ALTER TABLE "payload"."people" ADD COLUMN "last_name" varchar;
  ALTER TABLE "payload"."people" ADD COLUMN "job_title" varchar;
  ALTER TABLE "payload"."people" ADD COLUMN "industry_option_id" integer;
  ALTER TABLE "payload"."people" ADD COLUMN "industry" varchar;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "form_options_id" integer;
  ALTER TABLE "payload"."guestlist_texts" ADD CONSTRAINT "guestlist_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."guestlist"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."guestlist_rels" ADD CONSTRAINT "guestlist_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."guestlist"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."guestlist_rels" ADD CONSTRAINT "guestlist_rels_form_options_fk" FOREIGN KEY ("form_options_id") REFERENCES "payload"."form_options"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "form_options_list_idx" ON "payload"."form_options" USING btree ("list");
  CREATE INDEX "form_options_active_idx" ON "payload"."form_options" USING btree ("active");
  CREATE INDEX "form_options_updated_at_idx" ON "payload"."form_options" USING btree ("updated_at");
  CREATE INDEX "form_options_created_at_idx" ON "payload"."form_options" USING btree ("created_at");
  CREATE UNIQUE INDEX "list_label_idx" ON "payload"."form_options" USING btree ("list","label");
  CREATE INDEX "guestlist_texts_order_parent" ON "payload"."guestlist_texts" USING btree ("order","parent_id");
  CREATE INDEX "guestlist_rels_order_idx" ON "payload"."guestlist_rels" USING btree ("order");
  CREATE INDEX "guestlist_rels_parent_idx" ON "payload"."guestlist_rels" USING btree ("parent_id");
  CREATE INDEX "guestlist_rels_path_idx" ON "payload"."guestlist_rels" USING btree ("path");
  CREATE INDEX "guestlist_rels_form_options_id_idx" ON "payload"."guestlist_rels" USING btree ("form_options_id");
  ALTER TABLE "payload"."guestlist" ADD CONSTRAINT "guestlist_salutation_option_id_form_options_id_fk" FOREIGN KEY ("salutation_option_id") REFERENCES "payload"."form_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."guestlist" ADD CONSTRAINT "guestlist_industry_option_id_form_options_id_fk" FOREIGN KEY ("industry_option_id") REFERENCES "payload"."form_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."people" ADD CONSTRAINT "people_salutation_option_id_form_options_id_fk" FOREIGN KEY ("salutation_option_id") REFERENCES "payload"."form_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."people" ADD CONSTRAINT "people_industry_option_id_form_options_id_fk" FOREIGN KEY ("industry_option_id") REFERENCES "payload"."form_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_options_fk" FOREIGN KEY ("form_options_id") REFERENCES "payload"."form_options"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guestlist_salutation_option_idx" ON "payload"."guestlist" USING btree ("salutation_option_id");
  CREATE INDEX "guestlist_industry_option_idx" ON "payload"."guestlist" USING btree ("industry_option_id");
  CREATE INDEX "people_salutation_option_idx" ON "payload"."people" USING btree ("salutation_option_id");
  CREATE INDEX "people_industry_option_idx" ON "payload"."people" USING btree ("industry_option_id");
  CREATE INDEX "payload_locked_documents_rels_form_options_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("form_options_id");`)

  await seedFormOptions(payload, req)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."form_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."guestlist_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."guestlist_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."form_options" CASCADE;
  DROP TABLE "payload"."guestlist_texts" CASCADE;
  DROP TABLE "payload"."guestlist_rels" CASCADE;
  ALTER TABLE "payload"."guestlist" DROP CONSTRAINT "guestlist_salutation_option_id_form_options_id_fk";
  
  ALTER TABLE "payload"."guestlist" DROP CONSTRAINT "guestlist_industry_option_id_form_options_id_fk";
  
  ALTER TABLE "payload"."people" DROP CONSTRAINT "people_salutation_option_id_form_options_id_fk";
  
  ALTER TABLE "payload"."people" DROP CONSTRAINT "people_industry_option_id_form_options_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_options_fk";
  
  DROP INDEX "payload"."guestlist_salutation_option_idx";
  DROP INDEX "payload"."guestlist_industry_option_idx";
  DROP INDEX "payload"."people_salutation_option_idx";
  DROP INDEX "payload"."people_industry_option_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_form_options_id_idx";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "salutation_option_id";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "salutation";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "first_name";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "last_name";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "job_title";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "organisation";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "industry_option_id";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "industry";
  ALTER TABLE "payload"."people" DROP COLUMN "salutation_option_id";
  ALTER TABLE "payload"."people" DROP COLUMN "salutation";
  ALTER TABLE "payload"."people" DROP COLUMN "first_name";
  ALTER TABLE "payload"."people" DROP COLUMN "last_name";
  ALTER TABLE "payload"."people" DROP COLUMN "job_title";
  ALTER TABLE "payload"."people" DROP COLUMN "industry_option_id";
  ALTER TABLE "payload"."people" DROP COLUMN "industry";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "form_options_id";
  DROP TYPE "payload"."enum_form_options_list";`)
}

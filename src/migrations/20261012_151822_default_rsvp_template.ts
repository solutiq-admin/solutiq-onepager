import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedDefaultTemplate } from '../lib/events/rsvp-seed'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_events_extra_fields_standard" AS ENUM('salutation', 'firstName', 'lastName', 'email', 'jobTitle', 'organisation', 'industry', 'attendanceGoals');
  CREATE TYPE "payload"."enum_form_templates_extra_fields_standard" AS ENUM('salutation', 'firstName', 'lastName', 'email', 'jobTitle', 'organisation', 'industry', 'attendanceGoals');
  ALTER TABLE "payload"."events_extra_fields" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "payload"."events_extra_fields" ALTER COLUMN "type" DROP NOT NULL;
  ALTER TABLE "payload"."form_templates_extra_fields" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "payload"."form_templates_extra_fields" ALTER COLUMN "type" DROP NOT NULL;
  ALTER TABLE "payload"."events_extra_fields" ADD COLUMN "standard" "payload"."enum_events_extra_fields_standard";
  ALTER TABLE "payload"."form_templates_extra_fields" ADD COLUMN "standard" "payload"."enum_form_templates_extra_fields_standard";
  ALTER TABLE "payload"."form_templates" ADD COLUMN "is_default" boolean DEFAULT false;`)

  await seedDefaultTemplate(payload, req)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."events_extra_fields" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "payload"."events_extra_fields" ALTER COLUMN "type" SET NOT NULL;
  ALTER TABLE "payload"."form_templates_extra_fields" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "payload"."form_templates_extra_fields" ALTER COLUMN "type" SET NOT NULL;
  ALTER TABLE "payload"."events_extra_fields" DROP COLUMN "standard";
  ALTER TABLE "payload"."form_templates_extra_fields" DROP COLUMN "standard";
  ALTER TABLE "payload"."form_templates" DROP COLUMN "is_default";
  DROP TYPE "payload"."enum_events_extra_fields_standard";
  DROP TYPE "payload"."enum_form_templates_extra_fields_standard";`)
}

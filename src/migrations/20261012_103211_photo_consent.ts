import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_guestlist_photo_consent" AS ENUM('yes', 'no');
  ALTER TABLE "payload"."events" ADD COLUMN "ask_photo_consent" boolean DEFAULT true;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "photo_consent" "payload"."enum_guestlist_photo_consent";
  CREATE INDEX "guestlist_photo_consent_idx" ON "payload"."guestlist" USING btree ("photo_consent");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."guestlist_photo_consent_idx";
  ALTER TABLE "payload"."events" DROP COLUMN "ask_photo_consent";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "photo_consent";
  DROP TYPE "payload"."enum_guestlist_photo_consent";`)
}

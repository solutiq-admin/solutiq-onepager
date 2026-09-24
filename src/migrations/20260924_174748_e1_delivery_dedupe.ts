import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."guestlist" ADD COLUMN "consent_version" varchar;
  ALTER TABLE "payload"."guestlist" ADD COLUMN "consented_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."deliveries" ADD COLUMN "dedupe_key" varchar;
  CREATE UNIQUE INDEX "deliveries_dedupe_key_idx" ON "payload"."deliveries" USING btree ("dedupe_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."deliveries_dedupe_key_idx";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "consent_version";
  ALTER TABLE "payload"."guestlist" DROP COLUMN "consented_at";
  ALTER TABLE "payload"."deliveries" DROP COLUMN "dedupe_key";`)
}

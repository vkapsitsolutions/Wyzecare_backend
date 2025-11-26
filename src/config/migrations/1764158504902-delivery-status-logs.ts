import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliveryStatusLogs1764158504902 implements MigrationInterface {
  name = 'DeliveryStatusLogs1764158504902';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_status_logs_status_enum" AS ENUM('sent', 'queued', 'delivered', 'delivery_unknown', 'failed', 'undelivered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_status_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "alert_id" uuid, "user_id" uuid, "phone_number" character varying NOT NULL, "twilio_sid" character varying, "status" "public"."delivery_status_logs_status_enum" NOT NULL DEFAULT 'sent', "error" text, "sent_at" TIMESTAMP WITH TIME ZONE, "status_updated_at" TIMESTAMP WITH TIME ZONE, "message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e3bed4cc816d8d0e593f7542c5c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_975ee1b29cd5aac4e3d10a3c32" ON "delivery_status_logs" ("organization_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "FK_975ee1b29cd5aac4e3d10a3c32c" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "FK_5ad7503348e4d63482df369c3c1" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "FK_bfefcda7f13316346e00ce78921" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "delivery_status_logs" DROP CONSTRAINT "FK_bfefcda7f13316346e00ce78921"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_status_logs" DROP CONSTRAINT "FK_5ad7503348e4d63482df369c3c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_status_logs" DROP CONSTRAINT "FK_975ee1b29cd5aac4e3d10a3c32c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_975ee1b29cd5aac4e3d10a3c32"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_status_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."delivery_status_logs_status_enum"`,
    );
  }
}

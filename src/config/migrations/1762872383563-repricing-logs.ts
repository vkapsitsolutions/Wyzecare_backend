import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepricingLogs1762872383563 implements MigrationInterface {
  name = 'RepricingLogs1762872383563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "repricing_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "admin_id" uuid, "old_price_id" character varying, "old_monthly_price" numeric(10,2), "newMonthlyPrice" numeric(10,2) NOT NULL, "newPriceId" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "prorated_amount_cents" integer, "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a744d76b0ea911d7991c523a485" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "repricing_logs" ADD CONSTRAINT "FK_cd81f98209976677cd9c0038c46" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "repricing_logs" ADD CONSTRAINT "FK_b380d5369725e4ae4ff51fb9916" FOREIGN KEY ("admin_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "repricing_logs" DROP CONSTRAINT "FK_b380d5369725e4ae4ff51fb9916"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repricing_logs" DROP CONSTRAINT "FK_cd81f98209976677cd9c0038c46"`,
    );
    await queryRunner.query(`DROP TABLE "repricing_logs"`);
  }
}

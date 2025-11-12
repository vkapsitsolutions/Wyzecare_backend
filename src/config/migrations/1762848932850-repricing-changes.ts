import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepricingChanges1762848932850 implements MigrationInterface {
  name = 'RepricingChanges1762848932850';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "custom_price_per_license"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "custom_price_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "custom_price_assigned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "custom_monthly_price" numeric(10,2)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organizations"."custom_monthly_price" IS 'Custom price per license if different from plan default'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "custom_monthly_price_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "custom_monthly_price_id"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organizations"."custom_monthly_price" IS 'Custom price per license if different from plan default'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "custom_monthly_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "custom_price_assigned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "custom_price_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "custom_price_per_license" numeric(10,2)`,
    );
  }
}

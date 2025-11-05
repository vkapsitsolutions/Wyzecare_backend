import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionChanges1762327512801 implements MigrationInterface {
  name = 'SubscriptionChanges1762327512801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "custom_price_per_license" numeric(10,2)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organization_subscriptions"."custom_price_per_license" IS 'Custom price per license if different from plan default'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "custom_price_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "trial_patient_used" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organization_subscriptions"."trial_patient_used" IS 'Whether the free trial patient has been used'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "trial_ends_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organization_subscriptions"."trial_ends_at" IS 'When the trial patient expires (1 month from creation)'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_organization_type_enum" AS ENUM('Normal', 'Facility')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "organization_type" "public"."organizations_organization_type_enum" NOT NULL DEFAULT 'Normal'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "licensed_patient_count" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "used_patient_licenses" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organizations"."used_patient_licenses" IS 'Total number of patient licenses purchased'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "available_patient_licenses" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organizations"."available_patient_licenses" IS 'Total number of patient licenses purchased'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_user_type_enum" AS ENUM('Normal', 'Facility')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "user_type" "public"."user_user_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "user_type"`);
    await queryRunner.query(`DROP TYPE "public"."user_user_type_enum"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "organizations"."available_patient_licenses" IS 'Total number of patient licenses purchased'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "available_patient_licenses"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organizations"."used_patient_licenses" IS 'Total number of patient licenses purchased'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "used_patient_licenses"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "licensed_patient_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "organization_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organizations_organization_type_enum"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organization_subscriptions"."trial_ends_at" IS 'When the trial patient expires (1 month from creation)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "trial_ends_at"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organization_subscriptions"."trial_patient_used" IS 'Whether the free trial patient has been used'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "trial_patient_used"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "custom_price_id"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "organization_subscriptions"."custom_price_per_license" IS 'Custom price per license if different from plan default'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "custom_price_per_license"`,
    );
  }
}

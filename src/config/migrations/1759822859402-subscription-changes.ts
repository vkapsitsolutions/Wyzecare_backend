import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionChanges1759822859402 implements MigrationInterface {
  name = 'SubscriptionChanges1759822859402';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD "stripe_monthly_price_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD "stripe_yearly_price_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."organization_subscriptions_status_enum" RENAME TO "organization_subscriptions_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_status_enum" AS ENUM('active', 'cancelled', 'expired', 'past_due', 'trialing', 'paused', 'pending')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" TYPE "public"."organization_subscriptions_status_enum" USING "status"::"text"::"public"."organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_status_enum_old" AS ENUM('active', 'cancelled', 'expired', 'past_due', 'trialing', 'paused')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" TYPE "public"."organization_subscriptions_status_enum_old" USING "status"::"text"::"public"."organization_subscriptions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."organization_subscriptions_status_enum_old" RENAME TO "organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN "stripe_yearly_price_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN "stripe_monthly_price_id"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionPlans1755614043346 implements MigrationInterface {
  name = 'SubscriptionPlans1755614043346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plans_plan_type_enum" AS ENUM('care_plus')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "plan_type" "public"."subscription_plans_plan_type_enum" NOT NULL, "price_monthly" numeric(10,2) NOT NULL, "price_yearly" numeric(10,2), "max_patients" integer, "max_admins" integer, "max_users" integer, "max_calls_per_day" integer, "max_check_ins_per_day" integer, "max_call_length_minutes" integer, "script_builder_access" boolean NOT NULL DEFAULT false, "recording_history_days" integer, "ad_supported_discounts" boolean NOT NULL DEFAULT false, "features" text array, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0ebf9b0f0cbd7b2fb5b62e3facb" UNIQUE ("slug"), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_status_enum" AS ENUM('active', 'cancelled', 'expired', 'past_due', 'trialing', 'paused')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_billing_cycle_enum" AS ENUM('monthly', 'yearly')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."organization_subscriptions_status_enum" NOT NULL DEFAULT 'active', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "stripe_subscription_id" character varying(255), "stripe_customer_id" character varying(255), "billing_cycle" "public"."organization_subscriptions_billing_cycle_enum" NOT NULL DEFAULT 'monthly', "auto_renew" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "subscription_plan_id" uuid NOT NULL, CONSTRAINT "PK_64e17f1dc8ebe056b49e751a494" PRIMARY KEY ("id")); COMMENT ON COLUMN "organization_subscriptions"."billing_cycle" IS 'Billing cycle: ''monthly'' or ''yearly'''`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_history_status_enum" AS ENUM('succeeded', 'pending', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "status" "public"."payment_history_status_enum" NOT NULL, "stripe_payment_intent_id" character varying(255), "stripe_invoice_id" character varying(255), "description" text, "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "organization_subscription_id" uuid NOT NULL, CONSTRAINT "PK_5fcec51a769b65c0c3c0987f11c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_ee120ecc7d96135bd947a1ea7ae" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_8aad2e6b2214d24ab18c0b13a2f" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_history" ADD CONSTRAINT "FK_7385ce4a98d8c003ff2378a484a" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_history" ADD CONSTRAINT "FK_285427f10822b604b8fa95b2263" FOREIGN KEY ("organization_subscription_id") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_history" DROP CONSTRAINT "FK_285427f10822b604b8fa95b2263"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_history" DROP CONSTRAINT "FK_7385ce4a98d8c003ff2378a484a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_8aad2e6b2214d24ab18c0b13a2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_ee120ecc7d96135bd947a1ea7ae"`,
    );
    await queryRunner.query(`DROP TABLE "payment_history"`);
    await queryRunner.query(`DROP TYPE "public"."payment_history_status_enum"`);
    await queryRunner.query(`DROP TABLE "organization_subscriptions"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_billing_cycle_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plans_plan_type_enum"`,
    );
  }
}

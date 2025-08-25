import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1756121737126 implements MigrationInterface {
  name = 'InitialMigration1756121737126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."role_slug_enum" AS ENUM('super_admin', 'administrator', 'care_coordinator', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_enum" AS ENUM('view_all_patients', 'edit_patients', 'view_reports', 'manage_alerts', 'manage_users', 'system_settings')`,
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "slug" "public"."role_slug_enum" NOT NULL, "permissions" "public"."role_permissions_enum" array NOT NULL DEFAULT '{}', "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_35c9b140caaf6da09cfabb0d67" ON "role" ("slug") `,
    );
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
      `CREATE TYPE "public"."organizations_timezone_enum" AS ENUM('UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Johannesburg', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_date_format_enum" AS ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_language_enum" AS ENUM('en', 'es', 'fr', 'hi', 'zh', 'ar', 'pt', 'de', 'ja', 'bn')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "address" jsonb, "contact_info" jsonb, "timezone" "public"."organizations_timezone_enum" NOT NULL DEFAULT 'UTC', "date_format" "public"."organizations_date_format_enum" NOT NULL DEFAULT 'MM/DD/YYYY', "language" "public"."organizations_language_enum" NOT NULL DEFAULT 'en', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id")); COMMENT ON COLUMN "organizations"."address" IS 'Organization address details'; COMMENT ON COLUMN "organizations"."contact_info" IS 'Phone, email, website'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_gender_enum" AS ENUM('male', 'female')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_login_provider_enum" AS ENUM('local', 'google')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email" character varying NOT NULL, "email_verified" boolean NOT NULL DEFAULT false, "password" character varying, "refresh_token_hash" character varying, "last_login" TIMESTAMP WITH TIME ZONE, "gender" "public"."user_gender_enum", "status" "public"."user_status_enum" NOT NULL DEFAULT 'ACTIVE', "photo" character varying, "login_provider" "public"."user_login_provider_enum" NOT NULL DEFAULT 'local', "invitation_accepted_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "organization_id" uuid, "role_id" uuid, "created_by_id" uuid, "updated_by_id" uuid, "deleted_by_id" uuid, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "invitation_token" character varying NOT NULL, "invitation_link" character varying, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE, "status" "public"."user_invitations_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "role_id" uuid NOT NULL, "invited_by" uuid NOT NULL, CONSTRAINT "UQ_299e6a82a403100f02d8b813bcb" UNIQUE ("invitation_token"), CONSTRAINT "PK_c8005acb91c3ce9a7ae581eca8f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."verification_tokens_type_enum" AS ENUM('EMAIL_OTP', 'PHONE_OTP', 'PASSWORD_RESET')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."verification_tokens_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "verification_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "email" character varying, "type" "public"."verification_tokens_type_enum" NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "status" "public"."verification_tokens_status_enum" NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c1894684e3901e727838393c972" UNIQUE ("email"), CONSTRAINT "PK_f2d4d7a2aa57ef199e61567db22" PRIMARY KEY ("id"))`,
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
      `ALTER TABLE "user" ADD CONSTRAINT "FK_3e103cdf85b7d6cb620b4db0f0c" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_fb2e442d14add3cefbdf33c4561" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_b489bba7c2e3d5afcd98a445ff8" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_7a4f92de626d8dc4b05f06ad181" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_1fb9f8026273e4c97c57c1f7cf7" FOREIGN KEY ("deleted_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_67c909a3f4ea4e1912f04f3fe23" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_690d152fabcef9620306b6d20d3" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_18241a1a2cb2d284716636b2340" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_tokens" ADD CONSTRAINT "FK_31d2079dc4079b80517d31cf4f2" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
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
      `ALTER TABLE "verification_tokens" DROP CONSTRAINT "FK_31d2079dc4079b80517d31cf4f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_18241a1a2cb2d284716636b2340"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_690d152fabcef9620306b6d20d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_67c909a3f4ea4e1912f04f3fe23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_1fb9f8026273e4c97c57c1f7cf7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_7a4f92de626d8dc4b05f06ad181"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_b489bba7c2e3d5afcd98a445ff8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_fb2e442d14add3cefbdf33c4561"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_3e103cdf85b7d6cb620b4db0f0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_8aad2e6b2214d24ab18c0b13a2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_ee120ecc7d96135bd947a1ea7ae"`,
    );
    await queryRunner.query(`DROP TABLE "payment_history"`);
    await queryRunner.query(`DROP TYPE "public"."payment_history_status_enum"`);
    await queryRunner.query(`DROP TABLE "verification_tokens"`);
    await queryRunner.query(
      `DROP TYPE "public"."verification_tokens_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."verification_tokens_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "user_invitations"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_invitations_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_login_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_gender_enum"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TYPE "public"."organizations_language_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."organizations_date_format_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."organizations_timezone_enum"`);
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
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35c9b140caaf6da09cfabb0d67"`,
    );
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TYPE "public"."role_permissions_enum"`);
    await queryRunner.query(`DROP TYPE "public"."role_slug_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRoles1755003413640 implements MigrationInterface {
  name = 'UserRoles1755003413640';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."role_slug_enum" AS ENUM('super_admin', 'administrator', 'care_coordinator', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_enum" AS ENUM('view_all_patients', 'view_assigned_patients', 'edit_patients', 'view_reports', 'manage_alerts', 'manage_users', 'invite_users', 'manage_patient_access', 'system_settings', 'manage_consent', 'view_hipaa_logs', 'export_data', 'manage_roles')`,
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "slug" "public"."role_slug_enum" NOT NULL, "permissions" "public"."role_permissions_enum" array NOT NULL DEFAULT '{}', "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_35c9b140caaf6da09cfabb0d67" ON "role" ("slug") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "email_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "refresh_token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "last_login" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "status" "public"."user_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "photo" character varying`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_login_provider_enum" AS ENUM('local', 'google')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "login_provider" "public"."user_login_provider_enum" NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "invitation_accepted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "otp" character varying`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "otp_expires" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "created_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "user" ADD "updated_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "user" ADD "deleted_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "user" ADD "role_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `,
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
      `ALTER TABLE "user" ADD CONSTRAINT "FK_fb2e442d14add3cefbdf33c4561" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_fb2e442d14add3cefbdf33c4561"`,
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
      `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email")`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "role_id"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deleted_by_id"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_by_id"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created_by_id"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "otp_expires"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "otp"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "invitation_accepted_at"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "login_provider"`);
    await queryRunner.query(`DROP TYPE "public"."user_login_provider_enum"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "photo"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "last_login"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "refresh_token_hash"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email_verified"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35c9b140caaf6da09cfabb0d67"`,
    );
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TYPE "public"."role_permissions_enum"`);
    await queryRunner.query(`DROP TYPE "public"."role_slug_enum"`);
  }
}

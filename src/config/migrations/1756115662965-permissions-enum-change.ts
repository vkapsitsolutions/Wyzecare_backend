import { MigrationInterface, QueryRunner } from 'typeorm';

export class PermissionsEnumChange1756115662965 implements MigrationInterface {
  name = 'PermissionsEnumChange1756115662965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_enum" RENAME TO "role_permissions_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_enum" AS ENUM('view_all_patients', 'edit_patients', 'view_reports', 'manage_alerts', 'manage_users', 'system_settings')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "permissions" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "permissions" TYPE "public"."role_permissions_enum"[] USING "permissions"::"text"::"public"."role_permissions_enum"[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "permissions" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`DROP TYPE "public"."role_permissions_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_enum_old" AS ENUM('view_all_patients', 'view_assigned_patients', 'edit_patients', 'view_reports', 'manage_alerts', 'manage_users', 'invite_users', 'manage_patient_access', 'system_settings', 'manage_consent', 'view_hipaa_logs', 'export_data', 'manage_roles')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "permissions" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "permissions" TYPE "public"."role_permissions_enum_old"[] USING "permissions"::"text"::"public"."role_permissions_enum_old"[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "permissions" SET DEFAULT '{}'`,
    );
    await queryRunner.query(`DROP TYPE "public"."role_permissions_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_enum_old" RENAME TO "role_permissions_enum"`,
    );
  }
}

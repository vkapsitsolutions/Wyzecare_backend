import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutidtLogs1760090573826 implements MigrationInterface {
  name = 'AutidtLogs1760090573826';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_role_enum" AS ENUM('super_admin', 'administrator', 'care_coordinator', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('User Login', 'Failed Login', 'User Logout', 'User Created', 'User Role Change', 'User Permission Change', 'User Deactivated', 'User Deleted', 'Patient Access', 'Patient Edit', 'Patient Export', 'Patient Print', 'Patient Share', 'Patient Deletion', 'Patient Archival', 'Patient Created', 'Call Script Created', 'Call Script Updated', 'Call Scheduled', 'Call Schedule Edited', 'Call Schedule Deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "actor_id" uuid, "role" "public"."audit_logs_role_enum", "action" "public"."audit_logs_action_enum" NOT NULL, "module_id" uuid, "module_name" character varying NOT NULL, "payload" jsonb, "message" character varying, "reason" character varying, "ip_address" character varying, "device_info" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_145f35b204c731ba7fc1a0be0e" ON "audit_logs" ("organization_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_177183f29f438c488b5e8510cdb" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_177183f29f438c488b5e8510cdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_145f35b204c731ba7fc1a0be0e"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_role_enum"`);
  }
}

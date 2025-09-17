import { MigrationInterface, QueryRunner } from 'typeorm';

export class CallRunsTable1757923527296 implements MigrationInterface {
  name = 'CallRunsTable1757923527296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."call_runs_status_enum" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED', 'SKIPPED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "call_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "schedule_id" uuid, "patient_id" uuid NOT NULL, "script_id" uuid, "scheduled_for" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."call_runs_status_enum" NOT NULL DEFAULT 'SCHEDULED', "attempts_count" integer NOT NULL DEFAULT '0', "allowed_attempts" integer, "total_duration_seconds" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c2d58ac212f87f322b269363621" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a255a81d96f8345b5639ad8fe" ON "call_runs" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "allowed_attempts"`,
    );
    await queryRunner.query(`ALTER TABLE "calls" DROP COLUMN "scheduled_for"`);
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "call_run_id" uuid NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "calls" ADD "webhook_response" jsonb`);
    await queryRunner.query(
      `ALTER TYPE "public"."calls_status_enum" RENAME TO "calls_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."calls_status_enum" AS ENUM('REGISTERED', 'NOT_CONNECTED', 'ONGOING', 'ENDED', 'ERROR')`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ALTER COLUMN "status" TYPE "public"."calls_status_enum" USING "status"::"text"::"public"."calls_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ALTER COLUMN "status" SET DEFAULT 'REGISTERED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."calls_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "call_runs" ADD CONSTRAINT "FK_64bdae0621922fe29b34f71c3a9" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" ADD CONSTRAINT "FK_5ec92d725386ce057f673bc3f09" FOREIGN KEY ("schedule_id") REFERENCES "call_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" ADD CONSTRAINT "FK_0e363f3a82056115164a355fa8a" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" ADD CONSTRAINT "FK_9680e381314d6cc20c12248589c" FOREIGN KEY ("script_id") REFERENCES "call_scripts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD CONSTRAINT "FK_ba9a8beebd58cb90c075207bf5c" FOREIGN KEY ("call_run_id") REFERENCES "call_runs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" DROP CONSTRAINT "FK_ba9a8beebd58cb90c075207bf5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" DROP CONSTRAINT "FK_9680e381314d6cc20c12248589c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" DROP CONSTRAINT "FK_0e363f3a82056115164a355fa8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" DROP CONSTRAINT "FK_5ec92d725386ce057f673bc3f09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_runs" DROP CONSTRAINT "FK_64bdae0621922fe29b34f71c3a9"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."calls_status_enum_old" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED', 'SKIPPED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ALTER COLUMN "status" TYPE "public"."calls_status_enum_old" USING "status"::"text"::"public"."calls_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."calls_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."calls_status_enum_old" RENAME TO "calls_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "webhook_response"`,
    );
    await queryRunner.query(`ALTER TABLE "calls" DROP COLUMN "call_run_id"`);
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "scheduled_for" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "allowed_attempts" integer`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a255a81d96f8345b5639ad8fe"`,
    );
    await queryRunner.query(`DROP TABLE "call_runs"`);
    await queryRunner.query(`DROP TYPE "public"."call_runs_status_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleTimezoneChange1757577575656 implements MigrationInterface {
  name = 'ScheduleTimezoneChange1757577575656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD "last_completed" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD "deleted_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP COLUMN "timezone"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_schedules_timezone_enum" AS ENUM('America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles')`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD "timezone" "public"."call_schedules_timezone_enum" NOT NULL DEFAULT 'America/New_York'`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ALTER COLUMN "time_window_start" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ALTER COLUMN "time_window_end" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD CONSTRAINT "FK_ebf88123e8bcb5e14343380af58" FOREIGN KEY ("deleted_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP CONSTRAINT "FK_ebf88123e8bcb5e14343380af58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ALTER COLUMN "time_window_end" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ALTER COLUMN "time_window_start" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP COLUMN "timezone"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."call_schedules_timezone_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD "timezone" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP COLUMN "deleted_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP COLUMN "last_completed"`,
    );
  }
}

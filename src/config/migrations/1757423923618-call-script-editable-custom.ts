import { MigrationInterface, QueryRunner } from 'typeorm';

export class CallScriptEditableCustom1757423923618
  implements MigrationInterface
{
  name = 'CallScriptEditableCustom1757423923618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ADD "editable" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."script_category_enum" RENAME TO "script_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."script_category_enum" AS ENUM('WELLNESS_CHECK', 'MEDICATION_REMINDER', 'SAFETY_CHECK', 'MOOD_ASSESSMENT', 'EMERGENCY_FOLLOW_UP', 'CUSTOM')`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ALTER COLUMN "category" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ALTER COLUMN "category" TYPE "public"."script_category_enum" USING "category"::"text"::"public"."script_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ALTER COLUMN "category" SET DEFAULT 'CUSTOM'`,
    );
    await queryRunner.query(`DROP TYPE "public"."script_category_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."script_category_enum_old" AS ENUM('WELLNESS_CHECK', 'MEDICATION_REMINDER', 'SAFETY_CHECK', 'MOOD_ASSESSMENT', 'EMERGENCY_FOLLOW_UP')`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ALTER COLUMN "category" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ALTER COLUMN "category" TYPE "public"."script_category_enum_old" USING "category"::"text"::"public"."script_category_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ALTER COLUMN "category" SET DEFAULT 'WELLNESS_CHECK'`,
    );
    await queryRunner.query(`DROP TYPE "public"."script_category_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."script_category_enum_old" RENAME TO "script_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" DROP COLUMN "editable"`,
    );
  }
}

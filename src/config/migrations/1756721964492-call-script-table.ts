import { MigrationInterface, QueryRunner } from 'typeorm';

export class CallScriptTable1756721964492 implements MigrationInterface {
  name = 'CallScriptTable1756721964492';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."script_category_enum" AS ENUM('WELLNESS_CHECK', 'MEDICATION_REMINDER', 'SAFETY_CHECK', 'MOOD_ASSESSMENT', 'EMERGENCY_FOLLOW_UP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."script_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "call_scripts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "title" character varying NOT NULL, "slug" character varying NOT NULL, "category" "public"."script_category_enum" NOT NULL DEFAULT 'WELLNESS_CHECK', "status" "public"."script_status_enum" NOT NULL DEFAULT 'active', "version" character varying(50) NOT NULL DEFAULT 'v1.0', "estimated_duration" integer, "opening_message" text, "closing_message" text, "escalation_triggers" text array, "created_by_id" uuid, "updated_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_organization_script_slug" UNIQUE ("organization_id", "slug"), CONSTRAINT "PK_207f474fe50296a99e54eda80cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."question_type_enum" AS ENUM('YES_NO', 'MULTIPLE_CHOICE', 'SCALE', 'OPEN_ENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "script_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "script_id" uuid NOT NULL, "question_order" integer NOT NULL, "question_text" text NOT NULL, "question_type" "public"."question_type_enum" NOT NULL, "is_required" boolean NOT NULL DEFAULT false, "response_options" jsonb, "scale_min" integer, "scale_max" integer, "scale_labels" jsonb, "yes_response" text, "no_response" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_script_questions_script_order" UNIQUE ("script_id", "question_order"), CONSTRAINT "PK_6686ecc96604f601e1fa8e7281a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ADD CONSTRAINT "FK_dd11bdf536b24842f4182c16163" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ADD CONSTRAINT "FK_f2b4fa69936b70825142f1b35fa" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ADD CONSTRAINT "FK_c41a82fbd42ae88034883c5f2b8" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "script_questions" ADD CONSTRAINT "FK_6693483c469dece1dd8e80e26ab" FOREIGN KEY ("script_id") REFERENCES "call_scripts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "script_questions" DROP CONSTRAINT "FK_6693483c469dece1dd8e80e26ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" DROP CONSTRAINT "FK_c41a82fbd42ae88034883c5f2b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" DROP CONSTRAINT "FK_f2b4fa69936b70825142f1b35fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_scripts" DROP CONSTRAINT "FK_dd11bdf536b24842f4182c16163"`,
    );
    await queryRunner.query(`DROP TABLE "script_questions"`);
    await queryRunner.query(`DROP TYPE "public"."question_type_enum"`);
    await queryRunner.query(`DROP TABLE "call_scripts"`);
    await queryRunner.query(`DROP TYPE "public"."script_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."script_category_enum"`);
  }
}

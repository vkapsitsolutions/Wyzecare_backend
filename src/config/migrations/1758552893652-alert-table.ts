import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertTable1758552893652 implements MigrationInterface {
  name = 'AlertTable1758552893652';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."alert_severity_enum" AS ENUM('informational', 'important', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alert_status_enum" AS ENUM('active', 'acknowledged', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "call_id" uuid, "call_run_id" uuid, "script_id" uuid, "alert_type" character varying NOT NULL, "severity" "public"."alert_severity_enum" NOT NULL, "status" "public"."alert_status_enum" NOT NULL DEFAULT 'active', "message" text, "trigger" text DEFAULT 'System Generated', "acknowledged_by" uuid, "acknowledged_at" TIMESTAMP WITH TIME ZONE, "resolved_by" uuid, "resolved_at" TIMESTAMP WITH TIME ZONE, "resolution_notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da7beb4a9ffd985d183f0220aa" ON "alerts" ("patient_id", "status", "severity") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alert_histories_previous_status_enum" AS ENUM('active', 'acknowledged', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alert_histories_new_status_enum" AS ENUM('active', 'acknowledged', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."alert_action_enum" AS ENUM('created', 'status_changed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "alert_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alert_id" uuid NOT NULL, "previous_status" "public"."alert_histories_previous_status_enum", "new_status" "public"."alert_histories_new_status_enum", "action" "public"."alert_action_enum" NOT NULL, "actor_user_id" uuid, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f91617502b75a9a1051f61d4d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0a2fe9e4daac453fb16686dd9" ON "alert_histories" ("alert_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_44bfa58a58a849cf7356b99b83c" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_14c811efa9af77c7e5ecc718efe" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_8ab95ef8c36d5a77fe7dfa1e47a" FOREIGN KEY ("call_run_id") REFERENCES "call_runs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_e5a709262b2af80e1cf9d81cab5" FOREIGN KEY ("script_id") REFERENCES "call_scripts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_70e5404e97a308f93a591991dbd" FOREIGN KEY ("acknowledged_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_41046b61b52edd41a1ba24079e4" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alert_histories" ADD CONSTRAINT "FK_d41156d9ad7024aa5a61761e314" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alert_histories" ADD CONSTRAINT "FK_be77abf5e015f7925942a81977e" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alert_histories" DROP CONSTRAINT "FK_be77abf5e015f7925942a81977e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alert_histories" DROP CONSTRAINT "FK_d41156d9ad7024aa5a61761e314"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_41046b61b52edd41a1ba24079e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_70e5404e97a308f93a591991dbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_e5a709262b2af80e1cf9d81cab5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_8ab95ef8c36d5a77fe7dfa1e47a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_14c811efa9af77c7e5ecc718efe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_44bfa58a58a849cf7356b99b83c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0a2fe9e4daac453fb16686dd9"`,
    );
    await queryRunner.query(`DROP TABLE "alert_histories"`);
    await queryRunner.query(`DROP TYPE "public"."alert_action_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."alert_histories_new_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."alert_histories_previous_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da7beb4a9ffd985d183f0220aa"`,
    );
    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TYPE "public"."alert_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."alert_severity_enum"`);
  }
}

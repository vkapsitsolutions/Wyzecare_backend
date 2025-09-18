import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientScriptAssign1758201973244 implements MigrationInterface {
  name = 'PatientScriptAssign1758201973244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "patient_script_assigns" ("script_id" uuid NOT NULL, "patient_id" uuid NOT NULL, CONSTRAINT "PK_3b8130fa187c6b806f98895031d" PRIMARY KEY ("script_id", "patient_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d2c91a7f56feca50586855600c" ON "patient_script_assigns" ("script_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1005a3a6f03c1c5afa4281bea3" ON "patient_script_assigns" ("patient_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_script_assigns" ADD CONSTRAINT "FK_d2c91a7f56feca50586855600c0" FOREIGN KEY ("script_id") REFERENCES "call_scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_script_assigns" ADD CONSTRAINT "FK_1005a3a6f03c1c5afa4281bea3b" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patient_script_assigns" DROP CONSTRAINT "FK_1005a3a6f03c1c5afa4281bea3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_script_assigns" DROP CONSTRAINT "FK_d2c91a7f56feca50586855600c0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1005a3a6f03c1c5afa4281bea3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d2c91a7f56feca50586855600c"`,
    );
    await queryRunner.query(`DROP TABLE "patient_script_assigns"`);
  }
}

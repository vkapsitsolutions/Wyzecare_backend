import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPateintAccess1756981807625 implements MigrationInterface {
  name = 'UserPateintAccess1756981807625';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_patient_access" ("user_id" uuid NOT NULL, "patient_id" uuid NOT NULL, CONSTRAINT "PK_c8f43ad405d758d4e804e5367d7" PRIMARY KEY ("user_id", "patient_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73dc93e046284e624ff9fef526" ON "user_patient_access" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e66bb1c1b9ee6f2f624d03a3b6" ON "user_patient_access" ("patient_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_patient_access" ADD CONSTRAINT "FK_73dc93e046284e624ff9fef526c" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_patient_access" ADD CONSTRAINT "FK_e66bb1c1b9ee6f2f624d03a3b6c" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_patient_access" DROP CONSTRAINT "FK_e66bb1c1b9ee6f2f624d03a3b6c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_patient_access" DROP CONSTRAINT "FK_73dc93e046284e624ff9fef526c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e66bb1c1b9ee6f2f624d03a3b6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73dc93e046284e624ff9fef526"`,
    );
    await queryRunner.query(`DROP TABLE "user_patient_access"`);
  }
}

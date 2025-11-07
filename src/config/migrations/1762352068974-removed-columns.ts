import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovedColumns1762352068974 implements MigrationInterface {
  name = 'RemovedColumns1762352068974';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "used_patient_licenses"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "available_patient_licenses"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "available_patient_licenses" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "used_patient_licenses" integer NOT NULL DEFAULT '0'`,
    );
  }
}

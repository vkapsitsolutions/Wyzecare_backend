import { MigrationInterface, QueryRunner } from 'typeorm';

export class DescriptionColumn1756814141980 implements MigrationInterface {
  name = 'DescriptionColumn1756814141980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_scripts" ADD "description" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_scripts" DROP COLUMN "description"`,
    );
  }
}

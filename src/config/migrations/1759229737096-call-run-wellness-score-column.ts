import { MigrationInterface, QueryRunner } from 'typeorm';

export class CallRunWellnessScoreColumn1759229737096
  implements MigrationInterface
{
  name = 'CallRunWellnessScoreColumn1759229737096';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_runs" ADD "wellness_score" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_runs" DROP COLUMN "wellness_score"`,
    );
  }
}

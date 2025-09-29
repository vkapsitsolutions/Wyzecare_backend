import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertsTableOrgId1758709091064 implements MigrationInterface {
  name = 'AlertsTableOrgId1758709091064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD "organization_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_ba66a38e94abfda415d5a9df76b" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_ba66a38e94abfda415d5a9df76b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP COLUMN "organization_id"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerId1760015893319 implements MigrationInterface {
  name = 'AddCustomerId1760015893319';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "stripe_customer_id" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "stripe_customer_id"`,
    );
  }
}

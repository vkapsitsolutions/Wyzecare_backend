import { MigrationInterface, QueryRunner } from 'typeorm';

export class CouponCodes1763105654744 implements MigrationInterface {
  name = 'CouponCodes1763105654744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "test_coupon_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "test_promo_code_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD "coupon_notified" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "coupon_notified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "test_promo_code_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "test_coupon_id"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPhoneField1763720364847 implements MigrationInterface {
  name = 'UserPhoneField1763720364847';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "phone_consent_provided" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "phone" character varying`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "phone_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6693483c469dece1dd8e80e26a" ON "script_questions" ("script_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd11bdf536b24842f4182c1616" ON "call_scripts" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71a193fe787f0f3c72395db3a5" ON "calls" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba66a38e94abfda415d5a9df76" ON "alerts" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_64bdae0621922fe29b34f71c3a" ON "call_runs" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3e103cdf85b7d6cb620b4db0f0" ON "user" ("organization_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3e103cdf85b7d6cb620b4db0f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_64bdae0621922fe29b34f71c3a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba66a38e94abfda415d5a9df76"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71a193fe787f0f3c72395db3a5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd11bdf536b24842f4182c1616"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6693483c469dece1dd8e80e26a"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone_verified"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "phone_consent_provided"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationTable1755094362022 implements MigrationInterface {
  name = 'OrganizationTable1755094362022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_timezone_enum" AS ENUM('UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Johannesburg', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_date_format_enum" AS ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_language_enum" AS ENUM('en', 'es', 'fr', 'hi', 'zh', 'ar', 'pt', 'de', 'ja', 'bn')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "address" jsonb, "contact_info" jsonb, "timezone" "public"."organizations_timezone_enum" NOT NULL DEFAULT 'UTC', "date_format" "public"."organizations_date_format_enum" NOT NULL DEFAULT 'MM/DD/YYYY', "language" "public"."organizations_language_enum" NOT NULL DEFAULT 'en', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id")); COMMENT ON COLUMN "organizations"."address" IS 'Organization address details'; COMMENT ON COLUMN "organizations"."contact_info" IS 'Phone, email, website'`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "organization_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_3e103cdf85b7d6cb620b4db0f0c" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_3e103cdf85b7d6cb620b4db0f0c"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "organization_id"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TYPE "public"."organizations_language_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."organizations_date_format_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."organizations_timezone_enum"`);
  }
}

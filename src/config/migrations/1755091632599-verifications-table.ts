import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationsTable1755091632599 implements MigrationInterface {
  name = 'VerificationsTable1755091632599';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."verification_tokens_type_enum" AS ENUM('EMAIL_OTP', 'PHONE_OTP', 'PASSWORD_RESET')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."verification_tokens_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "verification_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "email" character varying, "type" "public"."verification_tokens_type_enum" NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "status" "public"."verification_tokens_status_enum" NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c1894684e3901e727838393c972" UNIQUE ("email"), CONSTRAINT "PK_f2d4d7a2aa57ef199e61567db22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "otp_expires"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "otp"`);
    await queryRunner.query(
      `ALTER TABLE "verification_tokens" ADD CONSTRAINT "FK_31d2079dc4079b80517d31cf4f2" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "verification_tokens" DROP CONSTRAINT "FK_31d2079dc4079b80517d31cf4f2"`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "otp" character varying`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "otp_expires" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DROP TABLE "verification_tokens"`);
    await queryRunner.query(
      `DROP TYPE "public"."verification_tokens_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."verification_tokens_type_enum"`,
    );
  }
}

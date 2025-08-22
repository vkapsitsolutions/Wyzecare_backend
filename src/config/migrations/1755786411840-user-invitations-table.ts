import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserInvitationsTable1755786411840 implements MigrationInterface {
  name = 'UserInvitationsTable1755786411840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "invitation_token" character varying NOT NULL, "invitation_link" character varying, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE, "status" "public"."user_invitations_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, "role_id" uuid NOT NULL, "invited_by" uuid NOT NULL, CONSTRAINT "UQ_299e6a82a403100f02d8b813bcb" UNIQUE ("invitation_token"), CONSTRAINT "PK_c8005acb91c3ce9a7ae581eca8f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_67c909a3f4ea4e1912f04f3fe23" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_690d152fabcef9620306b6d20d3" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_18241a1a2cb2d284716636b2340" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_18241a1a2cb2d284716636b2340"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_690d152fabcef9620306b6d20d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_67c909a3f4ea4e1912f04f3fe23"`,
    );
    await queryRunner.query(`DROP TABLE "user_invitations"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_invitations_status_enum"`,
    );
  }
}

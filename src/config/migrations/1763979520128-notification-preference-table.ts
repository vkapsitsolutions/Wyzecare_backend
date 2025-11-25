import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPreferenceTable1763979520128
  implements MigrationInterface
{
  name = 'NotificationPreferenceTable1763979520128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "enabled_severity_levels" text, "sms_enabled" boolean NOT NULL DEFAULT true, "email_enabled" boolean NOT NULL DEFAULT true, "sms_opted_out" boolean NOT NULL DEFAULT false, "opted_out_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_64c90edc7310c6be7c10c96f67" UNIQUE ("user_id"), CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_64c90edc7310c6be7c10c96f675" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_64c90edc7310c6be7c10c96f675"`,
    );
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
  }
}

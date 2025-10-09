import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePaymentHistory1760015929796 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys referencing payment_history
    await queryRunner.query(
      `ALTER TABLE "payment_history" DROP CONSTRAINT IF EXISTS "FK_285427f10822b604b8fa95b2263"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_history" DROP CONSTRAINT IF EXISTS "FK_7385ce4a98d8c003ff2378a484a"`,
    );

    // Drop the payment_history table
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_history"`);

    // Drop related enum type
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."payment_history_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the enum type
    await queryRunner.query(
      `CREATE TYPE "public"."payment_history_status_enum" AS ENUM('succeeded', 'pending', 'failed', 'refunded')`,
    );

    // Recreate the payment_history table
    await queryRunner.query(`
      CREATE TABLE "payment_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "status" "public"."payment_history_status_enum" NOT NULL,
        "stripe_payment_intent_id" character varying(255),
        "stripe_invoice_id" character varying(255),
        "description" text,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "organization_subscription_id" uuid NOT NULL,
        CONSTRAINT "PK_5fcec51a769b65c0c3c0987f11c" PRIMARY KEY ("id")
      )
    `);

    // Recreate foreign key relations
    await queryRunner.query(
      `ALTER TABLE "payment_history" ADD CONSTRAINT "FK_7385ce4a98d8c003ff2378a484a" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_history" ADD CONSTRAINT "FK_285427f10822b604b8fa95b2263" FOREIGN KEY ("organization_subscription_id") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}

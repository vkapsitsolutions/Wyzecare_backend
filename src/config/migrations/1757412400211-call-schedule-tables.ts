import { MigrationInterface, QueryRunner } from 'typeorm';

export class CallScheduleTables1757412400211 implements MigrationInterface {
  name = 'CallScheduleTables1757412400211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // enums
    await queryRunner.query(
      `CREATE TYPE "public"."call_schedules_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_schedules_agent_gender_enum" AS ENUM('MALE', 'FEMALE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_schedules_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'PAUSED')`,
    );

    // call_schedules table (clean, no duplicate columns)
    await queryRunner.query(
      `CREATE TABLE "call_schedules" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "organization_id" uuid NOT NULL,
         "patient_id" uuid NOT NULL,
         "script_id" uuid NOT NULL,
         "frequency" "public"."call_schedules_frequency_enum" NOT NULL,
         "agent_gender" "public"."call_schedules_agent_gender_enum" NOT NULL,
         "max_attempts" integer NOT NULL DEFAULT '3',
         "retry_interval_minutes" integer NOT NULL DEFAULT '5',
         "timezone" character varying(100) NOT NULL,
         "time_window_start" TIME,
         "time_window_end" TIME,
         "preferred_days" jsonb,
         "instructions" text,
         "status" "public"."call_schedules_status_enum" NOT NULL DEFAULT 'ACTIVE',
         "estimated_duration_seconds" integer NOT NULL DEFAULT '30',
         "next_scheduled_at" TIMESTAMP WITH TIME ZONE,
         "created_by_id" uuid,
         "updated_by_id" uuid,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "deleted_at" TIMESTAMP WITH TIME ZONE,
         CONSTRAINT "PK_acc988773d3f4b36c6757c87a89" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01ca87051231276124feb6ce4f" ON "call_schedules" ("next_scheduled_at") `,
    );

    // calls enum + table
    await queryRunner.query(
      `CREATE TYPE "public"."calls_status_enum" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED', 'SKIPPED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "calls" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "organization_id" uuid NOT NULL,
         "external_id" character varying,
         "schedule_id" uuid,
         "patient_id" uuid NOT NULL,
         "script_id" uuid,
         "status" "public"."calls_status_enum" NOT NULL DEFAULT 'SCHEDULED',
         "attempt_number" integer NOT NULL DEFAULT '0',
         "allowed_attempts" integer,
         "scheduled_for" TIMESTAMP WITH TIME ZONE NOT NULL,
         "started_at" TIMESTAMP WITH TIME ZONE,
         "ended_at" TIMESTAMP WITH TIME ZONE,
         "duration_seconds" integer,
         "failure_reason" text,
         "meta" jsonb,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_d9171d91f8dd1a649659f1b6a20" PRIMARY KEY ("id")
       ); COMMENT ON COLUMN "calls"."external_id" IS 'External id provided by calling service used'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3449b34195836b85705f2c1ab9" ON "calls" ("status") `,
    );

    // === Convert existing timestamp columns to timestamptz preserving existing values ===
    // NOTE: interpreting existing timestamp WITHOUT TIME ZONE as UTC.
    // If your timestamps were stored in a different local zone, replace 'UTC' with that zone (e.g. 'Asia/Kolkata').

    // patient_contacts
    await queryRunner.query(
      `ALTER TABLE "patient_contacts"
         ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patient_contacts" SET "created_at" = now() WHERE "created_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "created_at" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_contacts"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patient_contacts" SET "updated_at" = now() WHERE "updated_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "updated_at" SET NOT NULL`,
    );

    // patient_emergency_contacts
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts"
         ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patient_emergency_contacts" SET "created_at" = now() WHERE "created_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "created_at" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patient_emergency_contacts" SET "updated_at" = now() WHERE "updated_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "updated_at" SET NOT NULL`,
    );

    // patient_medical_info
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info"
         ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patient_medical_info" SET "created_at" = now() WHERE "created_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "created_at" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_medical_info"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patient_medical_info" SET "updated_at" = now() WHERE "updated_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "updated_at" SET NOT NULL`,
    );

    // patients: created_at, updated_at, deleted_at (deleted_at remains nullable)
    await queryRunner.query(
      `ALTER TABLE "patients"
         ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patients" SET "created_at" = now() WHERE "created_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "created_at" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "patients"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "patients" SET "updated_at" = now() WHERE "updated_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "updated_at" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "patients"
         ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE
         USING deleted_at AT TIME ZONE 'UTC'`,
    );

    // === Foreign keys ===
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD CONSTRAINT "FK_a1e644f5d969b16982a50b1a93e" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD CONSTRAINT "FK_9d92ffdcd0d45f72ee27d248d5d" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD CONSTRAINT "FK_4609a67d18ed56c1dedd437e64b" FOREIGN KEY ("script_id") REFERENCES "call_scripts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD CONSTRAINT "FK_b31cfaac18252c576448f34841a" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" ADD CONSTRAINT "FK_de73b7aac8474eaf46d04c12a90" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "calls" ADD CONSTRAINT "FK_71a193fe787f0f3c72395db3a50" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD CONSTRAINT "FK_8f19c6a41d7844bea9b54d30e18" FOREIGN KEY ("schedule_id") REFERENCES "call_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD CONSTRAINT "FK_ac0822d998fc8645beb69024a2e" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD CONSTRAINT "FK_b16dba22284b4639ce6aba7c400" FOREIGN KEY ("script_id") REFERENCES "call_scripts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints (reverse order)
    await queryRunner.query(
      `ALTER TABLE "calls" DROP CONSTRAINT "FK_b16dba22284b4639ce6aba7c400"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP CONSTRAINT "FK_ac0822d998fc8645beb69024a2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP CONSTRAINT "FK_8f19c6a41d7844bea9b54d30e18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP CONSTRAINT "FK_71a193fe787f0f3c72395db3a50"`,
    );

    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP CONSTRAINT "FK_de73b7aac8474eaf46d04c12a90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP CONSTRAINT "FK_b31cfaac18252c576448f34841a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP CONSTRAINT "FK_4609a67d18ed56c1dedd437e64b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP CONSTRAINT "FK_9d92ffdcd0d45f72ee27d248d5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP CONSTRAINT "FK_a1e644f5d969b16982a50b1a93e"`,
    );

    // Convert timestamptz columns back to timestamp WITHOUT TIME ZONE (preserving instants)
    // We use AT TIME ZONE 'UTC' to convert timestamptz -> timestamp (wall time in UTC).
    await queryRunner.query(
      `ALTER TABLE "patients"
         ALTER COLUMN "deleted_at" TYPE TIMESTAMP
         USING deleted_at AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "patients"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );

    await queryRunner.query(
      `ALTER TABLE "patients"
         ALTER COLUMN "created_at" TYPE TIMESTAMP
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );

    // patient_medical_info
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_medical_info"
         ALTER COLUMN "created_at" TYPE TIMESTAMP
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );

    // patient_emergency_contacts
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts"
         ALTER COLUMN "created_at" TYPE TIMESTAMP
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );

    // patient_contacts
    await queryRunner.query(
      `ALTER TABLE "patient_contacts"
         ALTER COLUMN "updated_at" TYPE TIMESTAMP
         USING updated_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );

    await queryRunner.query(
      `ALTER TABLE "patient_contacts"
         ALTER COLUMN "created_at" TYPE TIMESTAMP
         USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );

    // Drop calls indexes/table/types
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3449b34195836b85705f2c1ab9"`,
    );
    await queryRunner.query(`DROP TABLE "calls"`);
    await queryRunner.query(`DROP TYPE "public"."calls_status_enum"`);

    // Drop call_schedules index/table/types
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01ca87051231276124feb6ce4f"`,
    );
    await queryRunner.query(`DROP TABLE "call_schedules"`);
    await queryRunner.query(`DROP TYPE "public"."call_schedules_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."call_schedules_agent_gender_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."call_schedules_frequency_enum"`,
    );
  }
}

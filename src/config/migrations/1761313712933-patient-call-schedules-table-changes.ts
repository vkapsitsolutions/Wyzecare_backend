import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientCallSchedulesTableChanges1761313712933
  implements MigrationInterface
{
  name = 'PatientCallSchedulesTableChanges1761313712933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0) Add column only if it doesn't exist (nullable, no default for now)
    const hasColumn = await queryRunner.hasColumn(
      'call_schedules',
      'start_date',
    );
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE "call_schedules" ADD COLUMN "start_date" date;
      `);
    }

    // 1) Update existing rows:
    //    Set start_date = created_at::date when possible.
    //    Also overwrite rows that have the single most-common start_date value (this
    //    handles the earlier migration-case where existing rows got the migration date).
    //    If created_at is NULL, fall back to now()::date.
    await queryRunner.query(`
      WITH most_common AS (
        SELECT "start_date"
        FROM "call_schedules"
        WHERE "start_date" IS NOT NULL
        GROUP BY "start_date"
        ORDER BY COUNT(*) DESC
        LIMIT 1
      )
      UPDATE "call_schedules"
      SET "start_date" = COALESCE("created_at"::date, now()::date)
      WHERE "start_date" IS NULL
         OR "start_date" = (SELECT "start_date" FROM most_common);
    `);

    // 2) Set a DB default for future inserts and make column NOT NULL
    await queryRunner.query(`
      ALTER TABLE "call_schedules" ALTER COLUMN "start_date" SET DEFAULT ('now'::text)::date;
    `);
    await queryRunner.query(`
      ALTER TABLE "call_schedules" ALTER COLUMN "start_date" SET NOT NULL;
    `);

    // 3) Keep your other generated changes
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "UQ_1dc2db3a63a0bf2388fbfee86b1"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1e644f5d969b16982a50b1a93" ON "call_schedules" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_231c2a4693ed4edb7ccf29d911" ON "patients" ("organization_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_231c2a4693ed4edb7ccf29d911"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1e644f5d969b16982a50b1a93"`,
    );

    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "UQ_1dc2db3a63a0bf2388fbfee86b1" UNIQUE ("patient_id")`,
    );

    // drop start_date column (removes default and not null)
    await queryRunner.query(
      `ALTER TABLE "call_schedules" DROP COLUMN IF EXISTS "start_date"`,
    );
  }
}

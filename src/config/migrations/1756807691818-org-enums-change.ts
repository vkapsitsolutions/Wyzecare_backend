import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgEnumsChange1756807691818 implements MigrationInterface {
  name = 'OrgEnumsChange1756807691818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- organizations.timezone ----------
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" DROP DEFAULT`,
    );

    // convert to text so we can normalize values safely
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" TYPE text USING "timezone"::text`,
    );

    // normalize values: map any NULL or unsupported timezone -> America/Chicago (adjust if needed)
    await queryRunner.query(
      `UPDATE "organizations"
         SET "timezone" = 'America/Chicago'
       WHERE "timezone" IS NULL
         OR "timezone" NOT IN ('America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles')`,
    );

    // rename existing enum to a backup name if it exists (use pg_type check)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_timezone_enum') THEN
          EXECUTE 'ALTER TYPE "public"."organizations_timezone_enum" RENAME TO "organizations_timezone_enum_old"';
        END IF;
      END
      $$;
    `);

    // create the new smaller enum only if it doesn't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_timezone_enum') THEN
          EXECUTE 'CREATE TYPE "public"."organizations_timezone_enum" AS ENUM(''America/New_York'',''America/Chicago'',''America/Denver'',''America/Los_Angeles'')';
        END IF;
      END
      $$;
    `);

    // convert column from text -> new enum
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" TYPE "public"."organizations_timezone_enum" USING "timezone"::text::"public"."organizations_timezone_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" SET DEFAULT 'America/New_York'`,
    );

    // Drop the backup old enum if present (optional)
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."organizations_timezone_enum_old"`,
    );

    // ---------- organizations.language ----------
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" TYPE text USING "language"::text`,
    );

    await queryRunner.query(
      `UPDATE "organizations"
         SET "language" = 'en'
       WHERE "language" IS NULL OR "language" NOT IN ('en','es','fr','hi')`,
    );

    // rename existing organizations_language_enum to backup if exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_language_enum') THEN
          EXECUTE 'ALTER TYPE "public"."organizations_language_enum" RENAME TO "organizations_language_enum_old"';
        END IF;
      END
      $$;
    `);

    // create new organizations_language_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_language_enum') THEN
          EXECUTE 'CREATE TYPE "public"."organizations_language_enum" AS ENUM(''en'',''es'',''fr'',''hi'')';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" TYPE "public"."organizations_language_enum" USING "language"::text::"public"."organizations_language_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" SET DEFAULT 'en'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."organizations_language_enum_old"`,
    );

    // ---------- patients.language_preference ----------
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" TYPE text USING "language_preference"::text`,
    );

    await queryRunner.query(
      `UPDATE "patients"
         SET "language_preference" = 'en'
       WHERE "language_preference" IS NULL OR "language_preference" NOT IN ('en','es','fr','hi')`,
    );

    // rename existing patients_language_preference_enum to backup if exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patients_language_preference_enum') THEN
          EXECUTE 'ALTER TYPE "public"."patients_language_preference_enum" RENAME TO "patients_language_preference_enum_old"';
        END IF;
      END
      $$;
    `);

    // create new patients_language_preference_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patients_language_preference_enum') THEN
          EXECUTE 'CREATE TYPE "public"."patients_language_preference_enum" AS ENUM(''en'',''es'',''fr'',''hi'')';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" TYPE "public"."patients_language_preference_enum" USING "language_preference"::text::"public"."patients_language_preference_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" SET DEFAULT 'en'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."patients_language_preference_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ---------- patients.language_preference (reverse) ----------
    // recreate the larger old enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patients_language_preference_enum_old') THEN
          EXECUTE 'CREATE TYPE "public"."patients_language_preference_enum_old" AS ENUM(''en'',''es'',''fr'',''hi'',''zh'',''ar'',''pt'',''de'',''ja'',''bn'')';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" DROP DEFAULT`,
    );
    // ensure it's text before converting (safe)
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" TYPE text USING "language_preference"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" TYPE "public"."patients_language_preference_enum_old" USING "language_preference"::text::"public"."patients_language_preference_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "language_preference" SET DEFAULT 'en'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."patients_language_preference_enum"`,
    );
    // rename old back to original name
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patients_language_preference_enum_old') THEN
          EXECUTE 'ALTER TYPE "public"."patients_language_preference_enum_old" RENAME TO "patients_language_preference_enum"';
        END IF;
      END
      $$;
    `);

    // ---------- organizations.language (reverse) ----------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_language_enum_old') THEN
          EXECUTE 'CREATE TYPE "public"."organizations_language_enum_old" AS ENUM(''en'',''es'',''fr'',''hi'',''zh'',''ar'',''pt'',''de'',''ja'',''bn'')';
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" TYPE text USING "language"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" TYPE "public"."organizations_language_enum_old" USING "language"::text::"public"."organizations_language_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "language" SET DEFAULT 'en'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."organizations_language_enum"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_language_enum_old') THEN
          EXECUTE 'ALTER TYPE "public"."organizations_language_enum_old" RENAME TO "organizations_language_enum"';
        END IF;
      END
      $$;
    `);

    // ---------- organizations.timezone (reverse) ----------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_timezone_enum_old') THEN
          EXECUTE 'CREATE TYPE "public"."organizations_timezone_enum_old" AS ENUM(''UTC'',''America/New_York'',''America/Chicago'',''America/Denver'',''America/Los_Angeles'',''America/Sao_Paulo'',''Europe/London'',''Europe/Paris'',''Europe/Berlin'',''Africa/Johannesburg'',''Asia/Kolkata'',''Asia/Dubai'',''Asia/Tokyo'',''Asia/Shanghai'',''Australia/Sydney'',''Pacific/Auckland'')';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" TYPE text USING "timezone"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" TYPE "public"."organizations_timezone_enum_old" USING "timezone"::text::"public"."organizations_timezone_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "timezone" SET DEFAULT 'UTC'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."organizations_timezone_enum"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizations_timezone_enum_old') THEN
          EXECUTE 'ALTER TYPE "public"."organizations_timezone_enum_old" RENAME TO "organizations_timezone_enum"';
        END IF;
      END
      $$;
    `);
  }
}

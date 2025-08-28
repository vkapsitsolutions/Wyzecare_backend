import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientConsentRelationChange1756380978966
  implements MigrationInterface
{
  name = 'PatientConsentRelationChange1756380978966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "allow_call_recording"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "data_retention_period"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_preferences_data_retention_period_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "recording_restrictions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "version" character varying(20) NOT NULL DEFAULT 'v1.0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "allow_call_recording" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "recording_restrictions" text`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."privacy_preferences_data_retention_period_enum" AS ENUM('1_year', '3_years', '5_years', '7_years', '10_years')`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "data_retention_period" "public"."privacy_preferences_data_retention_period_enum" NOT NULL DEFAULT '5_years'`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "version" character varying(20) NOT NULL DEFAULT 'v1.0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "version" character varying(20) NOT NULL DEFAULT 'v1.0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP CONSTRAINT "FK_7bd1d370a046c1fa8df6ec1e6f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD CONSTRAINT "UQ_7bd1d370a046c1fa8df6ec1e6f8" UNIQUE ("patient_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "preferred_relationship"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_preferences_preferred_relationship_enum" AS ENUM('parent', 'daughter', 'son', 'sibling', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "preferred_relationship" "public"."communication_preferences_preferred_relationship_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "authorized_purposes"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."hipaa_authorizations_authorized_purposes_enum" AS ENUM('Treatment and care coordination', 'Healthcare operations', 'Quality improvement activities', 'Wellness check calls and monitoring', 'Payment and billing activities', 'Emergency medical care', 'Care management and case management', 'Communication with emergency contacts')`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "authorized_purposes" "public"."hipaa_authorizations_authorized_purposes_enum" array`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."hipaa_authorizations_status_enum" AS ENUM('Granted', 'Not Granted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "status" "public"."hipaa_authorizations_status_enum" NOT NULL DEFAULT 'Not Granted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "signed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "signed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP CONSTRAINT "FK_38bad5bf2f49ea7d958f58f5e10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD CONSTRAINT "UQ_38bad5bf2f49ea7d958f58f5e10" UNIQUE ("patient_id")`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."privacy_preferences_authorized_recipients_enum" RENAME TO "privacy_preferences_authorized_recipients_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."privacy_preferences_authorized_recipients_enum" AS ENUM('Emergency contacts', 'Designated family members', 'Healthcare providers and specialists', 'Professional caregivers')`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ALTER COLUMN "authorized_recipients" TYPE "public"."privacy_preferences_authorized_recipients_enum"[] USING "authorized_recipients"::"text"::"public"."privacy_preferences_authorized_recipients_enum"[]`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."privacy_preferences_authorized_recipients_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP CONSTRAINT "FK_3b21894c68e4b910fe9b1abe156"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD CONSTRAINT "UQ_3b21894c68e4b910fe9b1abe156" UNIQUE ("patient_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "consent_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "consent_date" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD CONSTRAINT "FK_7bd1d370a046c1fa8df6ec1e6f8" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD CONSTRAINT "FK_38bad5bf2f49ea7d958f58f5e10" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD CONSTRAINT "FK_3b21894c68e4b910fe9b1abe156" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP CONSTRAINT "FK_3b21894c68e4b910fe9b1abe156"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP CONSTRAINT "FK_38bad5bf2f49ea7d958f58f5e10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP CONSTRAINT "FK_7bd1d370a046c1fa8df6ec1e6f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "consent_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD "consent_date" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP CONSTRAINT "UQ_3b21894c68e4b910fe9b1abe156"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD CONSTRAINT "FK_3b21894c68e4b910fe9b1abe156" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."privacy_preferences_authorized_recipients_enum_old" AS ENUM('emergency_contacts', 'designated_family_members', 'healthcare_providers', 'professional_caregivers')`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ALTER COLUMN "authorized_recipients" TYPE "public"."privacy_preferences_authorized_recipients_enum_old"[] USING "authorized_recipients"::"text"::"public"."privacy_preferences_authorized_recipients_enum_old"[]`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."privacy_preferences_authorized_recipients_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."privacy_preferences_authorized_recipients_enum_old" RENAME TO "privacy_preferences_authorized_recipients_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP CONSTRAINT "UQ_38bad5bf2f49ea7d958f58f5e10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD CONSTRAINT "FK_38bad5bf2f49ea7d958f58f5e10" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "signed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "signed_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."hipaa_authorizations_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "status" character varying(50) NOT NULL DEFAULT 'not_granted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP COLUMN "authorized_purposes"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."hipaa_authorizations_authorized_purposes_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD "authorized_purposes" text array`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "preferred_relationship"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_preferences_preferred_relationship_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "preferred_relationship" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP CONSTRAINT "UQ_7bd1d370a046c1fa8df6ec1e6f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD CONSTRAINT "FK_7bd1d370a046c1fa8df6ec1e6f8" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP COLUMN "version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "data_retention_period"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."privacy_preferences_data_retention_period_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "recording_restrictions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP COLUMN "allow_call_recording"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP COLUMN "version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "recording_restrictions" text`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_preferences_data_retention_period_enum" AS ENUM('1_year', '3_years', '5_years', '7_years', '10_years')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "data_retention_period" "public"."communication_preferences_data_retention_period_enum" NOT NULL DEFAULT '5_years'`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD "allow_call_recording" boolean NOT NULL DEFAULT false`,
    );
  }
}

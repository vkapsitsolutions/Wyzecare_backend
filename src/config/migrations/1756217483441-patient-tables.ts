import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientTables1756217483441 implements MigrationInterface {
  name = 'PatientTables1756217483441';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "patient_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "primary_phone" character varying(50) NOT NULL, "alternate_phone" character varying(50), "email" character varying(255), "street_address" character varying(500), "city" character varying(255), "state" character varying(255), "zip_code" character varying(50), "country" character varying(100) NOT NULL DEFAULT 'US', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_29708e59508146b5c9598bc110" UNIQUE ("patient_id"), CONSTRAINT "PK_e2d00fa2280fa17899b2b24850c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patient_emergency_contacts_relationship_enum" AS ENUM('parent', 'daughter', 'son', 'sibling', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "patient_emergency_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "relationship" "public"."patient_emergency_contacts_relationship_enum", "phone" character varying(50) NOT NULL, "alternate_phone" character varying(50), "email" character varying(255), "is_primary" boolean NOT NULL DEFAULT false, "can_receive_updates" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e455d20e7590a2dc9f6d5f5efd2" PRIMARY KEY ("id")); COMMENT ON COLUMN "patient_emergency_contacts"."can_receive_updates" IS 'Based on consent'`,
    );
    await queryRunner.query(
      `CREATE TABLE "patient_medical_info" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "conditions" text array, "medications" text array, "allergies" text array, "primary_physician" character varying(255), "physician_contact" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_0273f72c7ee5042721c531ff40" UNIQUE ("patient_id"), CONSTRAINT "PK_c31775e20987786078145051a5a" PRIMARY KEY ("id")); COMMENT ON COLUMN "patient_medical_info"."conditions" IS 'Medical conditions'; COMMENT ON COLUMN "patient_medical_info"."medications" IS 'Current medications'; COMMENT ON COLUMN "patient_medical_info"."allergies" IS 'Known allergies'; COMMENT ON COLUMN "patient_medical_info"."primary_physician" IS 'Primary physician name'; COMMENT ON COLUMN "patient_medical_info"."physician_contact" IS 'Physician contact info'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patients_gender_enum" AS ENUM('male', 'female')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patients_current_wellness_enum" AS ENUM('GOOD', 'FAIR', 'POOR')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patients_status_enum" AS ENUM('SCHEDULED', 'NOT_SCHEDULED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patients_language_preference_enum" AS ENUM('en', 'es', 'fr', 'hi', 'zh', 'ar', 'pt', 'de', 'ja', 'bn')`,
    );
    await queryRunner.query(
      `CREATE TABLE "patients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "patient_id" character varying(100) NOT NULL, "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "preferred_name" character varying(255), "gender" "public"."patients_gender_enum", "date_of_birth" date, "room_number" character varying(100), "floor" character varying(100), "current_wellness" "public"."patients_current_wellness_enum" NOT NULL DEFAULT 'GOOD', "status" "public"."patients_status_enum" NOT NULL DEFAULT 'NOT_SCHEDULED', "notes" text, "care_team" character varying(1000), "language_preference" "public"."patients_language_preference_enum" NOT NULL DEFAULT 'en', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "created_by_id" uuid, "updated_by_id" uuid, "deleted_by_id" uuid, CONSTRAINT "UQ_1dc2db3a63a0bf2388fbfee86b1" UNIQUE ("patient_id"), CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "telehealth_consents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "consent_given" boolean NOT NULL DEFAULT false, "consent_date" TIMESTAMP, "patient_signature" character varying(500), "data_sharing_restrictions" text, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_60e7c98e6f2365c8de530f004da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."privacy_preferences_authorized_recipients_enum" AS ENUM('emergency_contacts', 'designated_family_members', 'healthcare_providers', 'professional_caregivers')`,
    );
    await queryRunner.query(
      `CREATE TABLE "privacy_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "authorized_recipients" "public"."privacy_preferences_authorized_recipients_enum" array, "data_sharing_restrictions" text, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3331c888e2dadd4a33bdc822fc6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "hipaa_authorizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "witness_name" character varying(255), "witness_signature" character varying(500), "patient_signature" character varying(500), "specific_restrictions" text, "authorized_purposes" text array, "status" character varying(50) NOT NULL DEFAULT 'not_granted', "signed_at" TIMESTAMP, "expires_at" TIMESTAMP, "version" character varying(20) NOT NULL DEFAULT 'v1.0', "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8262ef29655f2afe2e6056ea68" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."consent_history_consent_type_enum" AS ENUM('hipaa_authorization', 'telehealth_consent', 'privacy_preferences', 'communication_preferences', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."consent_history_action_enum" AS ENUM('created', 'updated', 'revoked', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "consent_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "consent_type" "public"."consent_history_consent_type_enum" NOT NULL, "action" "public"."consent_history_action_enum" NOT NULL, "payload" jsonb, "actor_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bf7b512c22438b4428e6799ec91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_preferences_allowed_methods_enum" AS ENUM('phone_calls', 'voicemail_messages', 'email', 'sms')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_preferences_data_retention_period_enum" AS ENUM('1_year', '3_years', '5_years', '7_years', '10_years')`,
    );
    await queryRunner.query(
      `CREATE TABLE "communication_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" uuid NOT NULL, "allowed_methods" "public"."communication_preferences_allowed_methods_enum" array NOT NULL DEFAULT '{phone_calls}', "preferred_contact_id" uuid, "preferred_relationship" character varying(50), "communication_restrictions" text, "allow_call_recording" boolean NOT NULL DEFAULT false, "recording_restrictions" text, "data_retention_period" "public"."communication_preferences_data_retention_period_enum" NOT NULL DEFAULT '5_years', "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1891b9fe960de97fe2f8d4b4a35" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" ADD CONSTRAINT "FK_29708e59508146b5c9598bc1106" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ADD CONSTRAINT "FK_7c435d2996dabfe6e3fcec9f8a6" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" ADD CONSTRAINT "FK_0273f72c7ee5042721c531ff40a" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "FK_231c2a4693ed4edb7ccf29d9111" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "FK_b48dc58a26594f4674191275477" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "FK_891edb3ee767850e61c2649f5a2" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "FK_3ede5b8b5705bda33ea51b9eeaf" FOREIGN KEY ("deleted_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD CONSTRAINT "FK_3b21894c68e4b910fe9b1abe156" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" ADD CONSTRAINT "FK_4564d87292c1e7bab8fe00d386b" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD CONSTRAINT "FK_38bad5bf2f49ea7d958f58f5e10" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" ADD CONSTRAINT "FK_ef23ba04d628490246247b0a66d" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD CONSTRAINT "FK_9312f2733c74f952c3bb8660ba1" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" ADD CONSTRAINT "FK_e658887b9d541babf2c08fe6d40" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" ADD CONSTRAINT "FK_54ffb90af7c3c3adb129b5c7704" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" ADD CONSTRAINT "FK_ab13a72b3d12e86b60f73c31162" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD CONSTRAINT "FK_7bd1d370a046c1fa8df6ec1e6f8" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD CONSTRAINT "FK_8e633045e9d378e42313dc563d5" FOREIGN KEY ("preferred_contact_id") REFERENCES "patient_emergency_contacts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ADD CONSTRAINT "FK_03a3888726b0f0e65eace76f389" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP CONSTRAINT "FK_03a3888726b0f0e65eace76f389"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP CONSTRAINT "FK_8e633045e9d378e42313dc563d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" DROP CONSTRAINT "FK_7bd1d370a046c1fa8df6ec1e6f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" DROP CONSTRAINT "FK_ab13a72b3d12e86b60f73c31162"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_history" DROP CONSTRAINT "FK_54ffb90af7c3c3adb129b5c7704"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP CONSTRAINT "FK_e658887b9d541babf2c08fe6d40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hipaa_authorizations" DROP CONSTRAINT "FK_9312f2733c74f952c3bb8660ba1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP CONSTRAINT "FK_ef23ba04d628490246247b0a66d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "privacy_preferences" DROP CONSTRAINT "FK_38bad5bf2f49ea7d958f58f5e10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP CONSTRAINT "FK_4564d87292c1e7bab8fe00d386b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telehealth_consents" DROP CONSTRAINT "FK_3b21894c68e4b910fe9b1abe156"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_3ede5b8b5705bda33ea51b9eeaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_891edb3ee767850e61c2649f5a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_b48dc58a26594f4674191275477"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT "FK_231c2a4693ed4edb7ccf29d9111"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_info" DROP CONSTRAINT "FK_0273f72c7ee5042721c531ff40a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" DROP CONSTRAINT "FK_7c435d2996dabfe6e3fcec9f8a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_contacts" DROP CONSTRAINT "FK_29708e59508146b5c9598bc1106"`,
    );
    await queryRunner.query(`DROP TABLE "communication_preferences"`);
    await queryRunner.query(
      `DROP TYPE "public"."communication_preferences_data_retention_period_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_preferences_allowed_methods_enum"`,
    );
    await queryRunner.query(`DROP TABLE "consent_history"`);
    await queryRunner.query(`DROP TYPE "public"."consent_history_action_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."consent_history_consent_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "hipaa_authorizations"`);
    await queryRunner.query(`DROP TABLE "privacy_preferences"`);
    await queryRunner.query(
      `DROP TYPE "public"."privacy_preferences_authorized_recipients_enum"`,
    );
    await queryRunner.query(`DROP TABLE "telehealth_consents"`);
    await queryRunner.query(`DROP TABLE "patients"`);
    await queryRunner.query(
      `DROP TYPE "public"."patients_language_preference_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."patients_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."patients_current_wellness_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."patients_gender_enum"`);
    await queryRunner.query(`DROP TABLE "patient_medical_info"`);
    await queryRunner.query(`DROP TABLE "patient_emergency_contacts"`);
    await queryRunner.query(
      `DROP TYPE "public"."patient_emergency_contacts_relationship_enum"`,
    );
    await queryRunner.query(`DROP TABLE "patient_contacts"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1759318150292 implements MigrationInterface {
  name = 'Migrations1759318150292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // patient_emergency_contacts: rename old enum, create new, map values, set default, drop old enum
    await queryRunner.query(
      `ALTER TYPE "public"."patient_emergency_contacts_relationship_enum" RENAME TO "patient_emergency_contacts_relationship_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patient_emergency_contacts_relationship_enum" AS ENUM('partner_spouse', 'child', 'grandchild', 'friend', 'sibling', 'caregiver', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "relationship" TYPE "public"."patient_emergency_contacts_relationship_enum" USING (
         CASE "relationship"
           WHEN 'daughter' THEN 'child'
           WHEN 'son' THEN 'child'
           WHEN 'parent' THEN 'caregiver'
           WHEN 'sibling' THEN 'sibling'
           WHEN 'other' THEN 'other'
           ELSE 'other'
         END
       )::text::public."patient_emergency_contacts_relationship_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "relationship" SET DEFAULT 'other'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."patient_emergency_contacts_relationship_enum_old"`,
    );

    // communication_preferences: rename old enum, create new, map values, drop old enum
    await queryRunner.query(
      `ALTER TYPE "public"."communication_preferences_preferred_relationship_enum" RENAME TO "communication_preferences_preferred_relationship_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_preferences_preferred_relationship_enum" AS ENUM('partner_spouse', 'child', 'grandchild', 'friend', 'sibling', 'caregiver', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ALTER COLUMN "preferred_relationship" TYPE "public"."communication_preferences_preferred_relationship_enum" USING (
         CASE "preferred_relationship"
           WHEN 'daughter' THEN 'child'
           WHEN 'son' THEN 'child'
           WHEN 'parent' THEN 'caregiver'
           WHEN 'sibling' THEN 'sibling'
           WHEN 'other' THEN 'other'
           ELSE 'other'
         END
       )::text::public."communication_preferences_preferred_relationship_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_preferences_preferred_relationship_enum_old"`,
    );

    // keep your other existing change (patients.patient_id nullable)
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "patient_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // revert patients.patient_id NOT NULL
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "patient_id" SET NOT NULL`,
    );

    // Recreate old enum for communication_preferences and map values back (lossy)
    await queryRunner.query(
      `CREATE TYPE "public"."communication_preferences_preferred_relationship_enum_old" AS ENUM('parent', 'daughter', 'son', 'sibling', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_preferences" ALTER COLUMN "preferred_relationship" TYPE "public"."communication_preferences_preferred_relationship_enum_old" USING (
         CASE "preferred_relationship"
           WHEN 'partner_spouse' THEN 'parent'
           WHEN 'child' THEN 'daughter'      -- lossy: chooses daughter when original sex is unknown
           WHEN 'grandchild' THEN 'other'
           WHEN 'friend' THEN 'other'
           WHEN 'sibling' THEN 'sibling'
           WHEN 'caregiver' THEN 'parent'
           WHEN 'other' THEN 'other'
           ELSE 'other'
         END
       )::text::public."communication_preferences_preferred_relationship_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_preferences_preferred_relationship_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."communication_preferences_preferred_relationship_enum_old" RENAME TO "communication_preferences_preferred_relationship_enum"`,
    );

    // patient_emergency_contacts: recreate old enum and map values back (lossy)
    // remove default first if present
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "relationship" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patient_emergency_contacts_relationship_enum_old" AS ENUM('parent', 'daughter', 'son', 'sibling', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_emergency_contacts" ALTER COLUMN "relationship" TYPE "public"."patient_emergency_contacts_relationship_enum_old" USING (
         CASE "relationship"
           WHEN 'partner_spouse' THEN 'parent'
           WHEN 'child' THEN 'daughter'       -- lossy: chooses daughter when original sex is unknown
           WHEN 'grandchild' THEN 'other'
           WHEN 'friend' THEN 'other'
           WHEN 'sibling' THEN 'sibling'
           WHEN 'caregiver' THEN 'parent'
           WHEN 'other' THEN 'other'
           ELSE 'other'
         END
       )::text::public."patient_emergency_contacts_relationship_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."patient_emergency_contacts_relationship_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."patient_emergency_contacts_relationship_enum_old" RENAME TO "patient_emergency_contacts_relationship_enum"`,
    );
  }
}

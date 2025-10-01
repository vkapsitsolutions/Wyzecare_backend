import { GENDER } from 'src/common/types/gender.enum';
import { Organization } from 'src/organizations/entities/organization.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { PatientContact } from './patient-contact.entity';
import { PatientEmergencyContact } from './patient-emergency-contact.entity';
import { PatientMedicalInfo } from './patient-medical-info.entity';
import { LanguageEnum } from 'src/organizations/enums/organization.enum';
import { CommunicationPreferences } from 'src/patient-consents/entites/communication-preferences.entity';
import { ConsentHistory } from 'src/patient-consents/entites/consent-history.entity';
import { HIPAAAuthorization } from 'src/patient-consents/entites/hipaa-authorization.entity';
import { PrivacyPreferences } from 'src/patient-consents/entites/privacy-preferences.entity';
import { TelehealthConsent } from 'src/patient-consents/entites/telehealth-consent.entity';
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallScript } from 'src/call-scripts/entities/call-script.entity';
import { CallRun } from 'src/calls/entities/call-runs.entity';
import { Alert } from 'src/alerts/entities/alert.entity';

export enum WellnessStatusEnum {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export enum PatientStatusEnum {
  SCHEDULED = 'SCHEDULED',
  NOT_SCHEDULED = 'NOT_SCHEDULED',
}

@Entity({ name: 'patients' })
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'organization_id', nullable: false })
  organization_id!: string;

  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({
    name: 'patient_id',
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
  })
  patientId: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: false })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: false })
  lastName!: string;

  @Column({
    name: 'preferred_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  preferredName!: string;

  @Column({ name: 'gender', type: 'enum', enum: GENDER, nullable: true })
  gender?: GENDER;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({
    name: 'room_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  roomNumber?: string;

  @Column({
    name: 'floor',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  floor?: string;

  @Column({
    name: 'current_wellness',
    type: 'enum',
    enum: WellnessStatusEnum,
    default: WellnessStatusEnum.GOOD,
  })
  current_wellness!: WellnessStatusEnum;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PatientStatusEnum,
    nullable: false,
    default: PatientStatusEnum.NOT_SCHEDULED,
  })
  status!: PatientStatusEnum;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({
    name: 'care_team',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  careTeam?: string;

  @Column({
    name: 'language_preference',
    type: 'enum',
    nullable: false,
    enum: LanguageEnum,
    default: LanguageEnum.EN,
  })
  language_preference!: LanguageEnum;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @Column({
    name: 'created_by_id',
    type: 'uuid',
    nullable: true,
  })
  created_by_id?: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({
    name: 'updated_by_id',
    type: 'uuid',
    nullable: true,
  })
  updated_by_id?: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy?: User;

  @Column({
    name: 'deleted_by_id',
    type: 'uuid',
    nullable: true,
  })
  deleted_by_id?: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'deleted_by_id' })
  deletedBy?: User;

  @ManyToMany(() => User, (user) => user.accessiblePatients)
  usersWithAccess: User[];

  @OneToMany(() => CallSchedule, (callSchedule) => callSchedule.patient)
  callSchedules: CallSchedule[];

  @ManyToMany(() => CallScript, (callScript) => callScript.assignedPatients)
  assignedCallScripts: CallScript[];

  // convenience getter
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @OneToOne(() => PatientContact, (patientContact) => patientContact.patient, {
    eager: true,
  })
  contact: PatientContact;

  @OneToMany(
    () => PatientEmergencyContact,
    (emergencyContact) => emergencyContact.patient,
  )
  emergencyContacts: PatientEmergencyContact[];

  @OneToOne(() => PatientMedicalInfo, (medicalInfo) => medicalInfo.patient)
  medicalInfo: PatientMedicalInfo;

  // consent related tables

  @OneToMany(() => ConsentHistory, (consentHistory) => consentHistory.patient)
  consentHistory: ConsentHistory[];

  @OneToMany(
    () => CommunicationPreferences,
    (communicationPreferences) => communicationPreferences.patient,
  )
  communicationPreferences: CommunicationPreferences;

  @OneToMany(
    () => HIPAAAuthorization,
    (hipaaAuthorization) => hipaaAuthorization.patient,
  )
  hipaaAuthorizations: HIPAAAuthorization;

  @OneToMany(
    () => PrivacyPreferences,
    (privacyPreferences) => privacyPreferences.patient,
  )
  privacyPreferences: PrivacyPreferences;

  @OneToMany(
    () => TelehealthConsent,
    (telehealthConsent) => telehealthConsent.patient,
  )
  telehealthConsent: TelehealthConsent;

  @OneToMany(() => CallRun, (callRun) => callRun.patient)
  callRuns: CallRun[];

  @OneToMany(() => Alert, (alert) => alert.patient)
  alerts: Alert[];
}

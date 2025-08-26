import { Patient } from 'src/patients/entities/patient.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CommunicationMethodEnum,
  DataRetentionPeriodEnum,
} from '../enums/concents.enum';
import { PatientEmergencyContact } from 'src/patients/entities/patient-emergency-contact.entity';
import { User } from 'src/users/entities/user.entity';

@Entity({ name: 'communication_preferences' })
export class CommunicationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, (patient) => patient.communicationPreferences, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({
    name: 'allowed_methods',
    type: 'enum',
    enum: CommunicationMethodEnum,
    array: true,
    nullable: false,
    default: [CommunicationMethodEnum.PHONE],
  })
  allowed_methods!: CommunicationMethodEnum[];

  @Column('uuid', { name: 'preferred_contact_id', nullable: true })
  preferred_contact_id?: string | null;

  @ManyToOne(() => PatientEmergencyContact, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'preferred_contact_id' })
  preferred_contact?: PatientEmergencyContact | null;

  @Column({
    name: 'preferred_relationship',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  preferred_relationship?: string | null;

  @Column({ name: 'communication_restrictions', type: 'text', nullable: true })
  communication_restrictions?: string;

  @Column({ name: 'allow_call_recording', type: 'boolean', default: false })
  allow_call_recording!: boolean;

  @Column({ name: 'recording_restrictions', type: 'text', nullable: true })
  recording_restrictions?: string;

  @Column({
    name: 'data_retention_period',
    type: 'enum',
    enum: DataRetentionPeriodEnum,
    default: DataRetentionPeriodEnum.FIVE_YEARS,
  })
  data_retention_period!: DataRetentionPeriodEnum;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}

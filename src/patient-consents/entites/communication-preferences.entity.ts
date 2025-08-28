import { Patient } from 'src/patients/entities/patient.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommunicationMethodEnum } from '../enums/concents.enum';
import {
  PatientEmergencyContact,
  RelationshipEnum,
} from 'src/patients/entities/patient-emergency-contact.entity';
import { User } from 'src/users/entities/user.entity';

@Entity({ name: 'communication_preferences' })
export class CommunicationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @OneToOne(() => Patient, (patient) => patient.communicationPreferences, {
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
    type: 'enum',
    enum: RelationshipEnum,
    nullable: true,
  })
  preferred_relationship?: RelationshipEnum | null;

  @Column({ name: 'communication_restrictions', type: 'text', nullable: true })
  communication_restrictions?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @Column({ name: 'version', type: 'varchar', length: 20, default: 'v1.0' })
  version!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

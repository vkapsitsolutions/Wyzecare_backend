import { Patient } from 'src/patients/entities/patient.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import {
  AuthorizedRecipientEnum,
  DataRetentionPeriodEnum,
} from '../enums/concents.enum';
import { User } from 'src/users/entities/user.entity';

@Entity({ name: 'privacy_preferences' })
export class PrivacyPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @OneToOne(() => Patient, (patient) => patient.privacyPreferences, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({
    name: 'authorized_recipients',
    type: 'enum',
    enum: AuthorizedRecipientEnum,
    array: true,
    nullable: true,
  })
  authorized_recipients?: AuthorizedRecipientEnum[];

  @Column({ name: 'data_sharing_restrictions', type: 'text', nullable: true })
  data_sharing_restrictions?: string;

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

  @Column({ name: 'version', type: 'varchar', length: 20, default: 'v1.0' })
  version!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

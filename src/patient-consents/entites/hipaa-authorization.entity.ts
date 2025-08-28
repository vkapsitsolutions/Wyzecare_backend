import { Patient } from 'src/patients/entities/patient.entity';
import { User } from 'src/users/entities/user.entity';
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
  AuthorizedPurpose,
  HipaaAuthorizationStatus,
} from '../enums/concents.enum';

@Entity({ name: 'hipaa_authorizations' })
export class HIPAAAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, (patient) => patient.hipaaAuthorizations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({
    name: 'witness_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  witness_name?: string;

  @Column({
    name: 'witness_signature',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  witness_signature?: string;

  @Column({
    name: 'patient_signature',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  patient_signature?: string;

  @Column({ name: 'specific_restrictions', type: 'text', nullable: true })
  specific_restrictions?: string;

  @Column({
    name: 'authorized_purposes',
    type: 'enum',
    enum: AuthorizedPurpose,
    array: true,
    nullable: true,
  })
  authorized_purposes?: AuthorizedPurpose[];

  @Column({
    name: 'status',
    type: 'enum',
    enum: HipaaAuthorizationStatus,
    nullable: false,
    default: HipaaAuthorizationStatus.NOT_GRANTED,
  })
  status!: HipaaAuthorizationStatus;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signed_at?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expires_at?: Date;

  @Column({ name: 'version', type: 'varchar', length: 20, default: 'v1.0' })
  version!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

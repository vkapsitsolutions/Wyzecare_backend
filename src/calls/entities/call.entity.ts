import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { CallScript } from 'src/call-scripts/entities/call-script.entity';
import { Patient } from 'src/patients/entities/patient.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CallStatus } from '../enums/calls.enum';
import { Organization } from 'src/organizations/entities/organization.entity';
import { CallRun } from './call-runs.entity';

@Entity({ name: 'calls' })
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    nullable: true,
    comment: 'External id provided by calling service used',
  })
  external_id?: string;

  @Column('uuid', { name: 'call_run_id', nullable: false })
  call_run_id: string;

  @ManyToOne(() => CallRun, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'call_run_id' })
  call_run: CallRun;

  @Index()
  @Column('uuid', { name: 'organization_id', nullable: false })
  organization_id!: string;

  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column('uuid', { name: 'schedule_id', nullable: true })
  schedule_id?: string;

  @ManyToOne(() => CallSchedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: CallSchedule;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  // script used for this call (mirror of schedule.script_id for easier queries)
  @Column('uuid', { name: 'script_id', nullable: true })
  script_id?: string;

  @ManyToOne(() => CallScript, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'script_id' })
  script?: CallScript;

  @Column({
    type: 'enum',
    enum: CallStatus,
    name: 'status',
    default: CallStatus.REGISTERED,
  })
  @Index()
  status!: CallStatus;

  @Column({ name: 'attempt_number', type: 'int', default: 0 })
  attempt_number!: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  started_at?: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  ended_at?: Date;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  duration_seconds?: number;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failure_reason?: string; // e.g., 'Voicemail full', 'Network error'

  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta?: Record<string, unknown>;

  @Column({ name: 'webhook_response', type: 'jsonb', nullable: true })
  webhook_response?: Record<any, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

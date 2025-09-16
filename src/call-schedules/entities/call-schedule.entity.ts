import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Patient } from 'src/patients/entities/patient.entity';
import { CallScript } from 'src/call-scripts/entities/call-script.entity';
import { User } from 'src/users/entities/user.entity';
import {
  AgentGender,
  CallFrequency,
  ScheduleStatus,
} from '../enums/call-schedule.enum';
import { Organization } from 'src/organizations/entities/organization.entity';
import { TimezoneEnum } from 'src/organizations/enums/organization.enum';
import { CallRun } from 'src/calls/entities/call-runs.entity';

@Entity({ name: 'call_schedules' })
export class CallSchedule {
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

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column('uuid', { name: 'script_id', nullable: false })
  script_id!: string;

  @ManyToOne(() => CallScript, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'script_id' })
  script?: CallScript;

  @Column({
    type: 'enum',
    enum: CallFrequency,
    name: 'frequency',
    nullable: false,
  })
  frequency!: CallFrequency;

  @Column({ type: 'enum', enum: AgentGender })
  agent_gender: AgentGender;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  max_attempts!: number;

  @Column({ name: 'retry_interval_minutes', type: 'int', default: 5 })
  retry_interval_minutes!: number;

  @Column({
    type: 'enum',
    enum: TimezoneEnum,
    name: 'timezone',
    default: TimezoneEnum.AMERICA_NEW_YORK,
  })
  timezone: TimezoneEnum;

  @Column({ name: 'time_window_start', type: 'time', nullable: false })
  time_window_start!: string;

  @Column({ name: 'time_window_end', type: 'time', nullable: false })
  time_window_end!: string;

  @Column({ name: 'preferred_days', type: 'jsonb', nullable: true })
  preferred_days?: number[]; // [0..6] sunday=0

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions?: string;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    name: 'status',
    default: ScheduleStatus.ACTIVE,
  })
  status!: ScheduleStatus;

  @Column({ name: 'estimated_duration_seconds', type: 'int', default: 30 })
  estimated_duration_seconds!: number;

  @Column({ name: 'last_completed', type: 'timestamptz', nullable: true })
  last_completed?: Date | null;

  @Index()
  @Column({ name: 'next_scheduled_at', type: 'timestamptz', nullable: true })
  next_scheduled_at?: Date | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  created_by_id?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by?: User;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updated_by_id?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by_id' })
  updated_by?: User;

  @Column({ name: 'deleted_by_id', type: 'uuid', nullable: true })
  deleted_by_id?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'deleted_by_id' })
  deleted_by?: User;

  @OneToMany(() => CallRun, (callRun) => callRun.schedule)
  callRuns: CallRun[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deleted_at?: Date;
}

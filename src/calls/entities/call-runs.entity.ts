import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { CallSchedule } from 'src/call-schedules/entities/call-schedule.entity';
import { Patient } from 'src/patients/entities/patient.entity';
import { CallScript } from 'src/call-scripts/entities/call-script.entity';
import { CallRunStatus } from '../enums/calls.enum';
import { Call } from './call.entity';

@Entity({ name: 'call_runs' })
export class CallRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'organization_id', nullable: false })
  organization_id!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
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

  @Column('uuid', { name: 'script_id', nullable: true })
  script_id?: string;

  @ManyToOne(() => CallScript, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'script_id' })
  script?: CallScript;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduled_for!: Date;

  @Column({
    type: 'enum',
    enum: CallRunStatus,
    name: 'status',
    default: CallRunStatus.SCHEDULED,
  })
  @Index()
  status!: CallRunStatus;

  @Column({ name: 'attempts_count', type: 'int', default: 0 })
  attempts_count!: number;

  @Column({ name: 'allowed_attempts', type: 'int', nullable: true })
  allowed_attempts?: number;

  @Column({ name: 'total_duration_seconds', type: 'int', nullable: true })
  total_duration_seconds?: number;

  @Column({ name: 'wellness_score', type: 'int', nullable: true })
  wellness_score?: number;

  @OneToMany(() => Call, (call) => call.call_run)
  calls: Call[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

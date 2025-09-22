import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Call } from 'src/calls/entities/call.entity';
import { CallScript } from 'src/call-scripts/entities/call-script.entity';
import { User } from 'src/users/entities/user.entity';
import { CallRun } from 'src/calls/entities/call-runs.entity';
import { Patient } from 'src/patients/entities/patient.entity';

export enum AlertSeverity {
  INFORMATIONAL = 'informational',
  IMPORTANT = 'important',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity({ name: 'alerts' })
@Index(['patientId', 'status', 'severity'])
export class Alert {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column('uuid', { name: 'patient_id' })
  patientId: string;

  @Column('uuid', { name: 'call_id', nullable: true })
  callId?: string | null;

  @Column('uuid', { name: 'call_run_id', nullable: true })
  callRunId?: string | null;

  @Column('uuid', { name: 'script_id', nullable: true })
  scriptId?: string | null;

  @Column({
    name: 'alert_type',
  })
  alertType: string;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    name: 'severity',
    enumName: 'alert_severity_enum',
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    name: 'status',
    enumName: 'alert_status_enum',
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({ type: 'text', name: 'message', nullable: true })
  message: string;

  @Column({
    type: 'text',
    name: 'trigger',
    nullable: true,
    default: 'System Generated',
  })
  trigger?: string | null;

  @Column('uuid', { name: 'acknowledged_by', nullable: true })
  acknowledgedById?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'acknowledged_at',
    nullable: true,
  })
  acknowledgedAt?: Date | null;

  @Column('uuid', { name: 'resolved_by', nullable: true })
  resolvedById?: string | null;

  @Column({
    type: 'timestamptz',
    name: 'resolved_at',
    nullable: true,
  })
  resolvedAt?: Date | null;

  @Column({ type: 'text', name: 'resolution_notes', nullable: true })
  resolutionNotes?: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt: Date;

  @ManyToOne(() => Patient, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToOne(() => Call, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'call_id' })
  call?: Call | null;

  @ManyToOne(() => CallRun, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'call_run_id' })
  callRun?: CallRun | null;

  @ManyToOne(() => CallScript, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'script_id' })
  script?: CallScript | null;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledgedBy?: User | null;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy?: User | null;
}

import { User } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Alert } from 'src/alerts/entities/alert.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum SmsStatus {
  SENT = 'sent',
  QUEUED = 'queued',
  DELIVERED = 'delivered',
  DELIVERY_UNKNOWN = 'delivery_unknown',
  FAILED = 'failed',
  UNDELIVERED = 'undelivered',
}

@Entity('delivery_status_logs')
export class DeliveryStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'organization_id', nullable: false })
  @Index()
  organization_id!: string;

  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'alert_id', nullable: true })
  alertId: string;

  @ManyToOne(() => Alert, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'alert_id' })
  alert: Alert;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  user_id: string | null;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ name: 'twilio_sid', nullable: true })
  twilioSid: string;

  @Column({
    type: 'enum',
    enum: SmsStatus,
    default: SmsStatus.SENT,
  })
  status: SmsStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null; // For failures

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamptz', name: 'status_updated_at', nullable: true })
  statusUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  message: string | null; // The sent message for audit

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

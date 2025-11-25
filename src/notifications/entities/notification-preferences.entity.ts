import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { AlertSeverity } from 'src/alerts/entities/alert.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @OneToOne(() => User, (user) => user.notificationPreference, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'simple-array', nullable: true })
  enabled_severity_levels: AlertSeverity[]; // ['INFORMATIONAL', 'IMPORTANT', 'CRITICAL']

  @Column({ default: true })
  sms_enabled: boolean;

  @Column({ default: true })
  email_enabled: boolean;

  @Column({ default: false })
  sms_opted_out: boolean; // Tracks STOP replies

  @Column({ type: 'timestamptz', nullable: true })
  opted_out_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

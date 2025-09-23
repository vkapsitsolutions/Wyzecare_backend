import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Alert, AlertStatus } from './alert.entity';

export enum AlertAction {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
}

@Entity({ name: 'alert_histories' })
@Index(['alertId', 'createdAt'])
export class AlertHistory {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column('uuid', { name: 'alert_id' })
  alertId: string;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus?: AlertStatus | null;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    name: 'new_status',
    nullable: true,
  })
  newStatus?: AlertStatus | null;

  @Column({
    type: 'enum',
    enum: AlertAction,
    name: 'action',
    enumName: 'alert_action_enum',
  })
  action: AlertAction;

  @Column('uuid', { name: 'actor_user_id', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'text', name: 'note', nullable: true })
  note?: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt: Date;

  @ManyToOne(() => Alert, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'alert_id' })
  alert?: Alert | null;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: User | null;
}

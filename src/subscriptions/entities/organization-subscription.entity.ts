import { Organization } from 'src/organizations/entities/organization.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plans.entity';

export enum SubscriptionStatusEnum {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  PAUSED = 'paused',
  PENDING = 'pending',
}

export enum BillingCycleEnum {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity({ name: 'organization_subscriptions' })
export class OrganizationSubscription {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ name: 'organization_id' })
  organization_id!: string;

  @ManyToOne(() => SubscriptionPlan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subscription_plan_id' })
  subscription_plan!: SubscriptionPlan;

  @Column({ name: 'subscription_plan_id' })
  subscription_plan_id!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SubscriptionStatusEnum,
    nullable: false,
    default: SubscriptionStatusEnum.ACTIVE,
  })
  status!: SubscriptionStatusEnum;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: false })
  started_at!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  ends_at?: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelled_at?: Date | null;

  @Column({
    name: 'current_period_start',
    type: 'timestamptz',
    nullable: false,
  })
  current_period_start!: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: false })
  current_period_end!: Date;

  @Column({
    name: 'stripe_subscription_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripe_subscription_id?: string | null;

  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripe_customer_id?: string | null;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycleEnum,
    nullable: false,
    default: BillingCycleEnum.MONTHLY,
    comment: "Billing cycle: 'monthly' or 'yearly'",
  })
  billing_cycle!: BillingCycleEnum;
  @Column({
    name: 'auto_renew',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  auto_renew!: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updated_at!: Date;
}

import { Organization } from 'src/organizations/entities/organization.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { OrganizationSubscription } from './organization-subscription.entity';

export enum PaymentStatusEnum {
  SUCCEEDED = 'succeeded',
  PENDING = 'pending',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

const numericToNumberTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity({ name: 'payment_history' })
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @RelationId((ph: PaymentHistory) => ph.organization)
  organization_id!: string;

  @ManyToOne(() => OrganizationSubscription, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_subscription_id' })
  organization_subscription!: OrganizationSubscription;

  @RelationId((ph: PaymentHistory) => ph.organization_subscription)
  organization_subscription_id!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: numericToNumberTransformer,
  })
  amount!: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
  })
  currency!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatusEnum,
    nullable: false,
  })
  status!: PaymentStatusEnum;

  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripe_payment_intent_id?: string | null;

  @Column({
    name: 'stripe_invoice_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripe_invoice_id?: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string | null;

  @Column({
    name: 'paid_at',
    type: 'timestamptz',
    nullable: true,
  })
  paid_at?: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  created_at!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanTypeEnum {
  CARE_PLUS = 'care_plus',
}

const numericToNumberTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity({ name: 'subscription_plans' })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: 'enum',
    enum: PlanTypeEnum,
    nullable: false,
  })
  plan_type!: PlanTypeEnum;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: numericToNumberTransformer,
  })
  price_monthly!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericToNumberTransformer,
  })
  price_yearly?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_patients?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_admins?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_users?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_calls_per_day?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_check_ins_per_day?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_call_length_minutes?: number | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  script_builder_access!: boolean;

  @Column({
    type: 'int',
    nullable: true,
  })
  recording_history_days?: number | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  ad_supported_discounts!: boolean;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  features?: string[] | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_active!: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updated_at!: Date;
}

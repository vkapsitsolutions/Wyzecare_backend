import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address, ContactInfo } from '../types/organization.types';
import {
  DateFormatEnum,
  LanguageEnum,
  TimezoneEnum,
} from '../enums/organization.enum';
import { OrganizationSubscription } from 'src/subscriptions/entities/organization-subscription.entity';
import { USER_TYPE } from 'src/users/enums/user-type.enum';
import { User } from 'src/users/entities/user.entity';
import { numericToNumberTransformer } from 'src/common/helpers/numberic-to-number';

@Entity({ name: 'organizations' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'address',
    comment: 'Organization address details',
  })
  address?: Address;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'contact_info',
    comment: 'Phone, email, website',
  })
  contact_info?: ContactInfo;

  @Column({
    type: 'enum',
    enum: TimezoneEnum,
    name: 'timezone',
    default: TimezoneEnum.AMERICA_NEW_YORK,
  })
  timezone: TimezoneEnum;

  @Column({
    type: 'enum',
    enum: DateFormatEnum,
    name: 'date_format',
    default: DateFormatEnum.MM_DD_YYYY,
  })
  date_format: DateFormatEnum;

  @Column({
    type: 'enum',
    enum: LanguageEnum,
    name: 'language',
    default: LanguageEnum.EN,
  })
  language: LanguageEnum;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripe_customer_id?: string | null;

  @Column({
    type: 'enum',
    enum: USER_TYPE,
    name: 'organization_type',
    default: USER_TYPE.NORMAL,
  })
  organization_type: USER_TYPE;

  @Column({
    name: 'licensed_patient_count',
    type: 'int',
    nullable: false,
    default: 1,
  })
  licensed_patient_count!: number;

  @Column({ name: 'custom_price_assigned', type: 'boolean', default: false })
  custom_price_assigned: boolean;

  // Custom price per license (for negotiated rates)
  @Column({
    name: 'custom_monthly_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericToNumberTransformer,
    comment: 'Custom price per license if different from plan default',
  })
  custom_monthly_price?: number | null;

  // Custom price id (for negotiated rates)
  @Column({
    name: 'custom_monthly_price_id',
    type: 'varchar',
    nullable: true,
  })
  custom_monthly_price_id?: string | null;

  @Column({ name: 'test_coupon_id', type: 'varchar', nullable: true })
  test_coupon_id: string;

  @Column({ name: 'test_promo_code_id', type: 'varchar', nullable: true })
  test_promo_code_id: string;

  @Column({ name: 'coupon_notified', default: true })
  coupon_notified: boolean;

  @OneToMany(
    () => OrganizationSubscription,
    (subscription) => subscription.organization,
  )
  subscriptions: OrganizationSubscription[];

  @OneToMany(() => User, (user) => user.organization)
  users?: User[];
}

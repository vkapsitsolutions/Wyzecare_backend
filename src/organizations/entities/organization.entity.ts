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

  @OneToMany(
    () => OrganizationSubscription,
    (subscription) => subscription.organization,
  )
  subscriptions: OrganizationSubscription[];
}

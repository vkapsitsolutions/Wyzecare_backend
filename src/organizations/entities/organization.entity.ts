import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address, ContactInfo } from '../types/organization.types';
import {
  DateFormatEnum,
  LanguageEnum,
  TimezoneEnum,
} from '../enums/organization.enum';

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
    default: TimezoneEnum.UTC,
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
}

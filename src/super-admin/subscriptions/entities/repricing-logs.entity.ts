// src/repricing-logs/entities/repricing-log.entity.ts
import { Organization } from 'src/organizations/entities/organization.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('repricing_logs')
export class RepricingLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'admin_id', nullable: true })
  adminId?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin?: User;

  @Column({ name: 'old_price_id', nullable: true })
  oldPriceId?: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    name: 'old_monthly_price',
    nullable: true,
  })
  oldMonthlyPrice?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  newMonthlyPrice: number;

  @Column()
  newPriceId: string;

  @Column({ default: true })
  isActive: boolean;

  // Optional: Proration details
  @Column({ name: 'prorated_amount_cents', nullable: true })
  proratedAmountCents?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum VerificationType {
  EMAIL_OTP = 'EMAIL_OTP',
  PHONE_OTP = 'PHONE_OTP',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('verification_tokens')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  user_id?: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ type: 'enum', enum: VerificationType })
  type: VerificationType;

  @Column()
  token_hash: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at?: Date;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { Role } from 'src/roles/entities/role.entity';
import { User } from './user.entity';

export enum INVITATION_STATUS {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('user_invitations')
export class UserInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  email: string;

  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ unique: true })
  invitation_token: string;

  @Column({ nullable: true })
  invitation_link: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'invited_by' })
  invited_by: User;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date;

  @Column({
    type: 'enum',
    enum: INVITATION_STATUS,
    default: INVITATION_STATUS.PENDING,
  })
  status: INVITATION_STATUS;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

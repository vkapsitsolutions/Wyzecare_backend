import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { User } from 'src/users/entities/user.entity';

export enum AuditAction {
  USER_LOGIN = 'User Login',
  FAILED_LOGIN = 'Failed Login',
  USER_LOGOUT = 'User Logout',
  USER_CREATED = 'User Created',
  USER_ROLE_CHANGE = 'User Role Change',
  USER_PERMISSION_CHANGE = 'User Permission Change',
  USER_DEACTIVATED = 'User Deactivated',
  USER_DELETED = 'User Deleted',
  PATIENT_VIEW = 'Patient Access',
  PATIENT_EDIT = 'Patient Edit',
  PATIENT_EXPORT = 'Patient Export',
  PATIENT_PRINT = 'Patient Print',
  PATIENT_SHARE = 'Patient Share',
  PATIENT_DELETE = 'Patient Deletion',
  PATIENT_ARCHIVAL = 'Patient Archival',
  PATIENT_CREATED = 'Patient Created',
  CALL_SCRIPT_CREATED = 'Call Script Created',
  CALL_SCRIPT_UPDATED = 'Call Script Updated',
  CALL_SCHEDULED = 'Call Scheduled',
  CALL_SCHEDULE_EDITED = 'Call Schedule Edited',
  CALL_SCHEDULE_DELETED = 'Call Schedule Deleted',
  // Add more actions as needed for other clinical activities or features
}

export interface AuditPayload {
  before?: Record<string, any>;
  after?: Record<string, any>;
  [key: string]: any; // allow allow extra data
}

@Entity({ name: 'audit_logs' })
@Index(['organization_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: false })
  organization_id: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ type: 'uuid', nullable: true })
  actor_id?: string | null; // Null for system events like failed logins without user context

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ type: 'enum', enum: RoleName, nullable: true })
  role?: RoleName | null; // User's role at the time of action

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'uuid', nullable: true })
  module_id?: string | null; // ID of the affected object (e.g., patient_id, user_id)

  @Column({ nullable: false })
  module_name: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload?: AuditPayload; // Structured details: before/after values, sections accessed, reason, etc. if any

  @Column({ nullable: true })
  message?: string;

  @Column({ nullable: true })
  reason?: string; // For deletions/deactivations

  @Column({ type: 'varchar', nullable: true })
  ip_address?: string | null;

  @Column({ type: 'varchar', nullable: true })
  device_info?: string | null; // User-agent or device details if available

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}

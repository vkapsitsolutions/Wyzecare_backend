import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { USER_STATUS } from '../enums/user-status.enum';
import { LOGIN_PROVIDER } from '../enums/login.provider.enum';
import { Role } from 'src/roles/entities/role.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { GENDER } from 'src/common/types/gender.enum';
import { Patient } from 'src/patients/entities/patient.entity'; // Adjust path as needed
import { USER_TYPE } from '../enums/user-type.enum';
import { NotificationPreference } from 'src/notifications/entities/notification-preferences.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', nullable: true })
  organization_id?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ type: 'enum', enum: USER_TYPE, nullable: true })
  user_type: USER_TYPE;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ default: true })
  phone_consent_provided: boolean;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: false })
  phone_verified: boolean;

  @Column({ nullable: true, select: false })
  refresh_token_hash: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_login: Date;

  @Column({ type: 'enum', enum: GENDER, nullable: true })
  gender: GENDER;

  @Column({
    type: 'enum',
    enum: USER_STATUS,
    default: USER_STATUS.ACTIVE,
  })
  status: USER_STATUS;

  @Column({ nullable: true })
  photo: string;

  @Column({ type: 'enum', enum: LOGIN_PROVIDER, default: LOGIN_PROVIDER.LOCAL })
  login_provider: LOGIN_PROVIDER;

  @Column({ type: 'timestamptz', nullable: true })
  invitation_accepted_at: Date;

  @Column({ name: 'role_id', nullable: true })
  role_id: string;

  @ManyToOne(() => Role, { nullable: true, cascade: true })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'updated_by_id' })
  updated_by: User;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'deleted_by_id' })
  deleted_by: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date | null;

  @OneToOne(
    () => NotificationPreference,
    (notificationPreference) => notificationPreference.user,
  )
  notificationPreference: NotificationPreference;

  //  Many-to-many relation for accessible patients
  @ManyToMany(() => Patient, (patient) => patient.usersWithAccess)
  @JoinTable({
    name: 'user_patient_access',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'patient_id', referencedColumnName: 'id' },
  })
  accessiblePatients: Patient[];

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}

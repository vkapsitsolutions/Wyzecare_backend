import { Organization } from 'src/organizations/entities/organization.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ScriptCategory, ScriptStatus } from '../enums/call-scripts.enum';
import { User } from 'src/users/entities/user.entity';
import { ScriptQuestion } from './script-questions.entity';

@Unique('UQ_organization_script_slug', ['organization_id', 'slug'])
@Entity({ name: 'call_scripts' })
export class CallScript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: false })
  organization_id: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'title', nullable: false })
  title: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'slug', nullable: false })
  slug: string;

  @Column({
    type: 'enum',
    enum: ScriptCategory,
    name: 'category',
    enumName: 'script_category_enum',
    default: ScriptCategory.CUSTOM,
  })
  category!: ScriptCategory;

  @Column({
    type: 'enum',
    enum: ScriptStatus,
    name: 'status',
    enumName: 'script_status_enum',
    default: ScriptStatus.ACTIVE,
  })
  status!: ScriptStatus;

  @Column({ type: 'varchar', length: 50, default: 'v1.0' })
  version?: string;

  @Column({ type: 'int', name: 'estimated_duration', nullable: true })
  estimated_duration?: number | null; // seconds

  @Column({ type: 'text', name: 'opening_message', nullable: true })
  opening_message!: string;

  @Column({ type: 'text', name: 'closing_message', nullable: true })
  closing_message!: string;

  @Column('text', { name: 'escalation_triggers', array: true, nullable: true })
  escalation_triggers?: string[] | null;

  @Column('uuid', { name: 'created_by_id', nullable: true })
  created_by_id?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by?: User;

  @Column('uuid', { name: 'updated_by_id', nullable: true })
  updated_by_id?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by_id' })
  updated_by?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deleted_at!: Date;

  @Column({ type: 'boolean', default: true })
  editable: boolean;

  // Relations
  @OneToMany(() => ScriptQuestion, (q) => q.script, {
    cascade: true,
    eager: false,
  })
  questions?: ScriptQuestion[];
}

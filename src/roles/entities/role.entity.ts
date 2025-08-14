import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission, RoleName } from '../enums/roles-permissions.enum';

@Entity()
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Index({ unique: true })
  @Column({
    type: 'enum',
    enum: RoleName,
    nullable: false,
    name: 'slug',
  })
  slug: RoleName;

  @Column({
    type: 'enum',
    enum: Permission,
    array: true,
    nullable: false,
    default: [],
  })
  permissions: Permission[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}

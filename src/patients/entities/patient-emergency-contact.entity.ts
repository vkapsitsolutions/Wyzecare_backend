import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from './patient.entity';

export enum RelationshipEnum {
  PARENT = 'parent',
  DAUGHTER = 'daughter',
  SON = 'son',
  SIBLING = 'sibling',
  OTHER = 'other',
}

@Entity({ name: 'patient_emergency_contacts' })
export class PatientEmergencyContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, (patient) => patient.emergencyContacts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({
    name: 'relationship',
    type: 'enum',
    enum: RelationshipEnum,
    nullable: true,
  })
  relationship?: RelationshipEnum;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: false })
  phone!: string;

  @Column({
    name: 'alternate_phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  alternate_phone?: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  is_primary!: boolean;

  @Column({
    name: 'can_receive_updates',
    type: 'boolean',
    default: false,
    comment: 'Based on consent',
  })
  can_receive_updates!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Patient } from './patient.entity';

@Entity({ name: 'patient_contacts' })
export class PatientContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @OneToOne(() => Patient, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({
    name: 'primary_phone',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  primary_phone!: string;

  @Column({
    name: 'alternate_phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  alternate_phone?: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({
    name: 'street_address',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  street_address?: string;

  @Column({ name: 'city', type: 'varchar', length: 255, nullable: true })
  city?: string;

  @Column({ name: 'state', type: 'varchar', length: 255, nullable: true })
  state?: string;

  @Column({ name: 'zip_code', type: 'varchar', length: 50, nullable: true })
  zip_code?: string;

  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    nullable: false,
    default: 'US',
  })
  country!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}

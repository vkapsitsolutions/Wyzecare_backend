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

@Entity({ name: 'patient_medical_info' })
export class PatientMedicalInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @OneToOne(() => Patient, (patient) => patient.medicalInfo, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({
    name: 'conditions',
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Medical conditions',
  })
  conditions?: string[];

  @Column({
    name: 'medications',
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Current medications',
  })
  medications?: string[];

  @Column({
    name: 'allergies',
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Known allergies',
  })
  allergies?: string[];

  @Column({
    name: 'primary_physician',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Primary physician name',
  })
  primary_physician?: string;

  @Column({
    name: 'physician_contact',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Physician contact info',
  })
  physician_contact?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}

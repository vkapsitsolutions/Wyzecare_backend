import { Patient } from 'src/patients/entities/patient.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'telehealth_consents' })
export class TelehealthConsent {
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

  @Column({ name: 'consent_given', type: 'boolean', default: false })
  consent_given!: boolean;

  @Column({ name: 'consent_date', type: 'timestamptz', nullable: true })
  consent_date?: Date;

  @Column({
    name: 'patient_signature',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  patient_signature?: string;

  @Column({ name: 'data_sharing_restrictions', type: 'text', nullable: true })
  data_sharing_restrictions?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @Column({ name: 'version', type: 'varchar', length: 20, default: 'v1.0' })
  version!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

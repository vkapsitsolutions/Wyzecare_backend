import { Patient } from 'src/patients/entities/patient.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConsentActionEnum, ConsentTypeEnum } from '../enums/concents.enum';
import { User } from 'src/users/entities/user.entity';

@Entity({ name: 'consent_history' })
export class ConsentHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, (patient) => patient.consentHistory, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({ name: 'consent_type', type: 'enum', enum: ConsentTypeEnum })
  consent_type!: ConsentTypeEnum;

  @Column({ name: 'action', type: 'enum', enum: ConsentActionEnum })
  action!: ConsentActionEnum;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload?: Record<string, any>;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actor_id?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}

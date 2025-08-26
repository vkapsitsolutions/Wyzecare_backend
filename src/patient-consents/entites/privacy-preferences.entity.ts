import { Patient } from 'src/patients/entities/patient.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuthorizedRecipientEnum } from '../enums/concents.enum';
import { User } from 'src/users/entities/user.entity';

@Entity({ name: 'privacy_preferences' })
export class PrivacyPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'patient_id', nullable: false })
  patient_id!: string;

  @ManyToOne(() => Patient, (patient) => patient.privacyPreferences, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({
    name: 'authorized_recipients',
    type: 'enum',
    enum: AuthorizedRecipientEnum,
    array: true,
    nullable: true,
  })
  authorized_recipients?: AuthorizedRecipientEnum[];

  @Column({ name: 'data_sharing_restrictions', type: 'text', nullable: true })
  data_sharing_restrictions?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}

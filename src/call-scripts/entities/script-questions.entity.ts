import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CallScript } from './call-script.entity';
import { QuestionType } from '../enums/call-scripts.enum';

export interface ResponseOption {
  id: string; // a/b/c/d
  label: string; // Response option text
  value?: string | number; // Response option value
  metadata?: Record<string, unknown>;
}

/** Convenience alias for the jsonb response options array */
export type ResponseOptions = ResponseOption[];

/**
 * Labels for scale endpoints — keep flexible in case you want localized labels
 * or intermediate labels in the future.
 */
export interface ScaleLabels {
  min?: string;
  max?: string;
  /** allow additional labels keyed by name, e.g. { mid: 'Okay' } */
  [key: string]: string | undefined;
}

@Unique('UQ_script_questions_script_order', ['script_id', 'question_order'])
@Entity({ name: 'script_questions' })
export class ScriptQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid', { name: 'script_id' })
  script_id!: string;

  @ManyToOne(() => CallScript, (c) => c.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'script_id' })
  script!: CallScript;

  @Column({ name: 'question_order', type: 'int' })
  question_order!: number;

  @Column({ name: 'question_text', type: 'text' })
  question_text!: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    name: 'question_type',
    enumName: 'question_type_enum',
  })
  question_type!: QuestionType;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  is_required!: boolean;

  /**
   * For multiple_choice questions: array of ResponseOption objects.
   * Stored in Postgres as jsonb.
   */
  @Column({ type: 'jsonb', name: 'response_options', nullable: true })
  response_options?: ResponseOptions | null;

  @Column({ name: 'scale_min', type: 'int', nullable: true })
  scale_min?: number | null;

  @Column({ name: 'scale_max', type: 'int', nullable: true })
  scale_max?: number | null;

  /**
   * Labels for the scale endpoints, e.g. { min: 'Very bad', max: 'Very good' }.
   * Stored as jsonb.
   */
  @Column({ type: 'jsonb', name: 'scale_labels', nullable: true })
  scale_labels?: ScaleLabels | null;

  @Column({ type: 'text', name: 'yes_response', nullable: true })
  yes_response?: string | null;

  @Column({ type: 'text', name: 'no_response', nullable: true })
  no_response?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at!: Date;
}

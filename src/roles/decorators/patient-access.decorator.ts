import { SetMetadata } from '@nestjs/common';

export const PATIENT_ACCESS_KEY = 'patientAccess';
export const PatientAccessDecorator = (access: 'read' | 'write') =>
  SetMetadata(PATIENT_ACCESS_KEY, access);

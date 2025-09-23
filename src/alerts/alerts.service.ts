// src/patient-alerts/alerts.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertAction, AlertHistory } from './entites/alert-history.entity';
import { Alert, AlertSeverity, AlertStatus } from './entites/alert.entity';

export interface CreateAlertPayload {
  patientId: string;
  alertType: string; // keep as string to allow flexible alert_type values
  severity: AlertSeverity;
  message?: string;
  metadata?: any;
  trigger?: string;
  callId?: string | null;
  callRunId?: string | null;
  scriptId?: string | null;
  escalated?: boolean;
  escalatedTo?: string | null;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,

    @InjectRepository(AlertHistory)
    private readonly historyRepository: Repository<AlertHistory>,
  ) {}

  /**
   * Create an alert and append history in a transaction.
   *
   * actorUserId: optional id of user who triggered this creation (null for system).
   */
  async createAlert(
    dto: CreateAlertPayload,
    actorUserId?: string | null,
  ): Promise<Alert> {
    return this.alertsRepository.manager.transaction(async (manager) => {
      const alertRepo = manager.getRepository(Alert);
      const historyRepo = manager.getRepository(AlertHistory);

      // create alert entity
      const alert = alertRepo.create({
        patientId: dto.patientId,
        callId: dto.callId ?? null,
        callRunId: dto.callRunId ?? null,
        scriptId: dto.scriptId ?? null,
        alertType: dto.alertType,
        severity: dto.severity,
        status: AlertStatus.ACTIVE,
        message: dto.message ?? '',
      });

      const savedAlert = await alertRepo.save(alert);

      // append history (created)
      const history = historyRepo.create({
        alertId: savedAlert.id,
        previousStatus: null,
        newStatus: savedAlert.status,
        action: AlertAction.CREATED,
        actorUserId: actorUserId ?? null,
        note: dto.message ?? 'Alert created',
      });

      await historyRepo.save(history);

      return savedAlert;
    });
  }
}

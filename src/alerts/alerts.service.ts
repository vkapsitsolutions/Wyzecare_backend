import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Alert, AlertSeverity, AlertStatus } from './entities/alert.entity';
import { AlertAction, AlertHistory } from './entities/alert-history.entity';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { User } from 'src/users/entities/user.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { UpdateAlertStatusDto } from './dto/update-status.dto';
import { AlertWebhookPayload } from 'src/webhooks/types/alert-webhook-payload';
import { CallsService } from 'src/calls/calls.service';
import { EmailService } from 'src/email/email.service';
import { PatientAccessService } from 'src/patients/patient-access.service';
import { DYNAMIC_TEMPLATES } from 'src/email/templates/email-templates.enum';
import { ALERT_SEVERITY_COLORS } from 'src/email/types/send-mail.payload';
import { PatientsService } from 'src/patients/patients.service';
import { ConfigService } from '@nestjs/config';
import { capitalize } from 'src/common/helpers/capitalize';
import { NotificationPreferenceService } from 'src/notifications/notification-preferences.service';
import { SmsService } from 'src/notifications/sms.service';
import {
  DeliveryStatusLog,
  SmsStatus,
} from 'src/notifications/entities/delivery-status-logs.entity';

export interface CreateAlertPayload {
  organizationId: string;
  patientId: string;
  alertType: string; // keep as string to allow flexible alert_type values
  severity: AlertSeverity;
  message?: string;
  metadata?: any;
  trigger?: string;
  callId: string | null;
  callRunId: string | null;
  scriptId?: string | null;
}

export interface UpdateAlertStatusPayload {
  newStatus: AlertStatus;
  actorUserId: string;
  note?: string;
  resolutionNotes?: string; // Required if newStatus is RESOLVED
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,

    @InjectRepository(AlertHistory)
    private readonly historyRepository: Repository<AlertHistory>,

    @Inject(forwardRef(() => CallsService))
    private readonly callsService: CallsService,

    private readonly emailService: EmailService,

    private readonly patientAccessService: PatientAccessService,

    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,

    private readonly configService: ConfigService,

    private readonly notificationsPreferencesService: NotificationPreferenceService,

    private readonly smsService: SmsService,
  ) {}

  /**
   * Create an alert and append history in a transaction.
   *
   * actorUserId: optional id of user who triggered this creation (null for system).
   */
  async createAlert(
    payload: CreateAlertPayload,
    actorUserId?: string | null,
  ): Promise<Alert> {
    return this.alertsRepository.manager.transaction(async (manager) => {
      const alertRepo = manager.getRepository(Alert);
      const historyRepo = manager.getRepository(AlertHistory);

      // create alert entity
      const alert = alertRepo.create({
        organization_id: payload.organizationId,
        patientId: payload.patientId,
        callId: payload.callId ?? null,
        callRunId: payload.callRunId ?? null,
        scriptId: payload.scriptId ?? null,
        alertType: payload.alertType,
        severity: payload.severity,
        status: AlertStatus.ACTIVE,
        message: payload.message ?? '',
        trigger: payload.trigger ?? 'System Generated',
      });

      const savedAlert = await alertRepo.save(alert);

      // append history (created)
      const history = historyRepo.create({
        alertId: savedAlert.id,
        previousStatus: null,
        newStatus: savedAlert.status,
        action: AlertAction.CREATED,
        actorUserId: actorUserId ?? null,
        note: payload.message ?? 'Alert created',
      });

      await historyRepo.save(history);

      const patient = await this.patientsService.findPatientByIdInternal(
        payload.patientId,
      );

      const { users: accessibleUsers } =
        await this.patientAccessService.getUsersWithAccessToPatient(
          payload.patientId,
          payload.organizationId,
        );

      for (const user of accessibleUsers) {
        // Notify each user about the new alert
        await this.emailService.sendMail(
          user.email,
          {
            app_name: 'WyzeCare',
            recipient_name: user.fullName,
            patient_name: patient?.fullName,
            alert_type: capitalize(payload.alertType),
            severity: capitalize(payload.severity),
            severity_color: ALERT_SEVERITY_COLORS[payload.severity],
            message: payload.message ?? 'No message provided',
            trigger: payload.trigger ?? 'System Generated',
            frontend_url: `${this.configService.getOrThrow<string>('FRONTEND_URL')}/alerts`,
            timestamp: `${savedAlert.createdAt.toLocaleString('en-US', {
              timeZone: 'UTC',
            })} UTC`,
            current_year: new Date().getFullYear(),
            support_email: 'support@wyze.care',
          },
          DYNAMIC_TEMPLATES.ALERT_TEMPLATE_KEY,
        );

        // sms logic
        const shouldSendSmsAlert =
          await this.notificationsPreferencesService.shouldSendSmsAlert(
            user,
            alert.severity,
          );

        if (shouldSendSmsAlert) {
          const portalLink = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/alerts`;

          const smsResult = await this.smsService.sendAlertSms(
            user.phone,
            patient?.fullName || 'Patient',
            alert.severity,
            payload.alertType,
            payload.message || 'No message provided',
            portalLink,
          );

          if (smsResult.sid) {
            // Create SmsLog inside transaction
            await manager.getRepository(DeliveryStatusLog).save(
              manager.getRepository(DeliveryStatusLog).create({
                organization_id: patient?.organization_id,
                alertId: savedAlert.id,
                user_id: user.id,
                phoneNumber: user.phone,
                twilioSid: smsResult.sid,
                message: smsResult.formattedMessage,
                sentAt: new Date(),
              }),
            );

            this.logger.log(
              `Alert SMS sent to ${user.phone} for alert ${savedAlert.id}, SID: ${smsResult.sid}`,
            );
          } else {
            this.logger.error(
              `Failed to send Alert SMS to ${user.phone} for alert ${savedAlert.id}: ${smsResult.error}`,
            );
            // Log failure as DeliveryStatusLog with status 'failed'
            await manager.getRepository(DeliveryStatusLog).save(
              manager.getRepository(DeliveryStatusLog).create({
                alertId: savedAlert.id,
                user_id: user.id,
                phoneNumber: user.phone,
                twilioSid: 'N/A',
                status: SmsStatus.FAILED,
                message: smsResult.formattedMessage || null,
                error: smsResult.error || 'Unknown error',
                sentAt: new Date(),
                statusUpdatedAt: new Date(),
              }),
            );
          }
        }
      }

      return savedAlert;
    });
  }

  /**
   * General method to update the status of an alert, handling transitions and history.
   * Validates transitions: ACTIVE -> ACKNOWLEDGED -> RESOLVED.
   * Cannot revert to previous statuses.
   */
  async updateAlertStatus(
    alertId: string,
    dto: UpdateAlertStatusDto,
    loggedInUser: User,
  ) {
    return this.alertsRepository.manager.transaction(async (manager) => {
      const alertRepo = manager.getRepository(Alert);
      const historyRepo = manager.getRepository(AlertHistory);

      const alert = await alertRepo.findOne({
        where: { id: alertId },
        relations: { patient: { usersWithAccess: true } },
      });

      if (!alert) {
        throw new NotFoundException(`Alert with ID ${alertId} not found`);
      }

      if (alert.organization_id !== loggedInUser.organization_id) {
        throw new ForbiddenException(`You do not have access to this alert`);
      }

      if (loggedInUser && loggedInUser.role?.slug !== RoleName.ADMINISTRATOR) {
        const hasAccess = alert.patient.usersWithAccess.some(
          (user) => user.id === loggedInUser.id,
        );
        if (!hasAccess) {
          throw new ForbiddenException(`You do not have access to this alert`);
        }
      }

      const previousStatus = alert.status;

      if (previousStatus === dto.newStatus) {
        throw new BadRequestException(
          `Alert is already in status ${dto.newStatus}`,
        );
      }

      // Validate transitions
      if (
        dto.newStatus === AlertStatus.ACKNOWLEDGED &&
        previousStatus !== AlertStatus.ACTIVE
      ) {
        throw new BadRequestException(
          `Cannot acknowledge from ${previousStatus}`,
        );
      }

      if (
        dto.newStatus === AlertStatus.RESOLVED &&
        ![AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED].includes(previousStatus)
      ) {
        throw new BadRequestException(`Cannot resolve from ${previousStatus}`);
      }

      if (
        dto.newStatus === AlertStatus.ACTIVE &&
        previousStatus !== AlertStatus.ACTIVE
      ) {
        throw new BadRequestException(
          `Cannot revert to ACTIVE from ${previousStatus}`,
        );
      }

      // Update alert based on new status
      alert.status = dto.newStatus;

      if (dto.newStatus === AlertStatus.ACKNOWLEDGED) {
        alert.acknowledgedById = loggedInUser.id;
        alert.acknowledgedAt = new Date();
      } else if (dto.newStatus === AlertStatus.RESOLVED) {
        alert.resolvedById = loggedInUser.id;
        alert.resolvedAt = new Date();
      }

      const updatedAlert = await alertRepo.save(alert);

      // Append history
      const historyNote = `${alert.alertType} changed from ${previousStatus} to ${dto.newStatus}`;
      const history = historyRepo.create({
        alertId: updatedAlert.id,
        previousStatus,
        newStatus: dto.newStatus,
        action: AlertAction.STATUS_CHANGED,
        actorUserId: loggedInUser.id,
        note: historyNote,
      });

      await historyRepo.save(history);

      return {
        success: true,
        message: 'Alert status updated',
        data: updatedAlert,
      };
    });
  }

  /**
   * Find alerts with pagination and filters.
   * Includes patient relation for display purposes.
   */
  async findAlerts(getAlertsDto: GetAlertsDto, loggedInUser: User) {
    const {
      limit,
      page,
      endDate,
      keyword,
      severity,
      startDate,
      status,
      patientId,
    } = getAlertsDto;

    const qb = this.alertsRepository
      .createQueryBuilder('alert')
      .withDeleted()
      .where('alert.organization_id = :organizationId', {
        organizationId: loggedInUser.organization_id,
      })
      .leftJoinAndSelect('alert.patient', 'patient')
      .andWhere('(patient.deleted_at IS NULL)') // <-- ADDED
      .orderBy('alert.createdAt', 'DESC');

    if (status) {
      qb.andWhere('alert.status = :status', { status });
    }

    if (severity) {
      qb.andWhere('alert.severity = :severity', { severity });
    }

    if (keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('patient.firstName ILIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('patient.lastName ILIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('alert.alertType ILIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('alert.message ILIKE :keyword', {
              keyword: `%${keyword}%`,
            });
        }),
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // start of the day
      qb.andWhere('alert.createdAt >= :startDate', {
        startDate: start.toISOString(),
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // end of the day
      qb.andWhere('alert.createdAt <= :endDate', {
        endDate: end.toISOString(),
      });
    }

    if (patientId) {
      qb.andWhere('alert.patientId = :patientId', { patientId });
    }

    if (loggedInUser && loggedInUser.role?.slug !== RoleName.ADMINISTRATOR) {
      qb.innerJoin(
        'patient.usersWithAccess',
        'userAccess',
        'userAccess.id = :userId',
        { userId: loggedInUser.id },
      );
    }

    const total = await qb.getCount();

    qb.skip((page - 1) * limit).take(limit);

    const alerts = await qb.getMany();

    const totalPages = Math.ceil(total / limit);

    const createCountQb = (status: AlertStatus) => {
      const countQb = this.alertsRepository
        .createQueryBuilder('alert')
        .withDeleted()
        .leftJoin('alert.patient', 'patient')
        .where('alert.organization_id = :organizationId', {
          organizationId: loggedInUser.organization_id,
        })
        .andWhere('(patient.deleted_at IS NULL)') // <-- ADDED
        .andWhere('(patient.id IS NULL OR patient.deleted_at IS NULL)')
        .andWhere('alert.status = :status', { status });

      if (severity) {
        countQb.andWhere('alert.severity = :severity', { severity });
      }

      if (keyword) {
        countQb.andWhere(
          new Brackets((subQb) => {
            subQb
              .where('patient.firstName ILIKE :keyword', {
                keyword: `%${keyword}%`,
              })
              .orWhere('patient.lastName ILIKE :keyword', {
                keyword: `%${keyword}%`,
              })
              .orWhere('alert.alertType ILIKE :keyword', {
                keyword: `%${keyword}%`,
              })
              .orWhere('alert.message ILIKE :keyword', {
                keyword: `%${keyword}%`,
              });
          }),
        );
      }

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // start of the day
        countQb.andWhere('alert.createdAt >= :startDate', {
          startDate: start.toISOString(),
        });
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // end of the day
        countQb.andWhere('alert.createdAt <= :endDate', {
          endDate: end.toISOString(),
        });
      }

      if (patientId) {
        countQb.andWhere('alert.patientId = :patientId', { patientId });
      }

      if (loggedInUser && loggedInUser.role?.slug !== RoleName.ADMINISTRATOR) {
        countQb.innerJoin(
          'patient.usersWithAccess',
          'userAccess',
          'userAccess.id = :userId',
          { userId: loggedInUser.id },
        );
      }

      return countQb;
    };

    const activeCount = await createCountQb(AlertStatus.ACTIVE).getCount();

    const resolvedCount = await createCountQb(AlertStatus.RESOLVED).getCount();

    const acknowledgedCount = await createCountQb(
      AlertStatus.ACKNOWLEDGED,
    ).getCount();

    return {
      success: true,
      message: 'Alerts fetched',
      total,
      activeCount,
      resolvedCount,
      acknowledgedCount,
      page,
      limit,
      totalPages,
      alerts,
    };
  }

  async getAlertDetails(id: string, loggedInUser: User) {
    const qb = this.alertsRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.patient', 'patient')
      .leftJoinAndSelect('patient.contact', 'contact')
      .leftJoinAndSelect('patient.emergencyContacts', 'emergencyContacts')
      .leftJoinAndSelect('alert.acknowledgedBy', 'acknowledgedBy')
      .leftJoinAndSelect('alert.resolvedBy', 'resolvedBy')
      .leftJoinAndSelect('alert.script', 'script')
      .leftJoinAndSelect('alert.callRun', 'callRun')
      // .leftJoinAndSelect('alert.call', 'call')
      .where('alert.id = :id', { id })
      .andWhere('alert.organization_id = :organizationId', {
        organizationId: loggedInUser.organization_id,
      });

    // restrict to patients the user has access to (unless admin)
    if (loggedInUser && loggedInUser.role?.slug !== RoleName.ADMINISTRATOR) {
      qb.innerJoin(
        'patient.usersWithAccess',
        'userAccess',
        'userAccess.id = :userId',
        { userId: loggedInUser.id },
      );
    }

    const alert = await qb.getOne();

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Alert details fetched',
      alert,
    };
  }

  /**
   * Get the history for a specific alert.
   */
  async getAlertHistory(alertId: string, loggedInUser: User) {
    const alertHistory = await this.historyRepository.find({
      where: {
        alertId,
        alert: { organization_id: loggedInUser.organization_id },
      },
      order: { createdAt: 'DESC' },
      relations: ['actorUser', 'alert'],
    });

    return {
      success: true,
      message: 'Alert History fetched',
      alertHistory,
    };
  }

  async processAlertWebhook(payload: AlertWebhookPayload) {
    const { alert_data, call_id } = payload;

    const call = await this.callsService.getCallByExternalId(call_id);

    if (!call) {
      this.logger.warn(`No call found for external id : ${call_id}`);
      return;
    }

    const key = (payload.alert_data.category ?? '')
      .trim()
      .toUpperCase() as keyof typeof AlertSeverity;

    if (!(key in AlertSeverity)) {
      this.logger.warn(
        `Invalid alert category: ${payload.alert_data.category}`,
      );
      return;
    }

    const severity = AlertSeverity[key];

    const existingAlert = await this.alertsRepository.findOne({
      where: {
        call: { external_id: call_id },
      },
      relations: ['call'],
    });

    if (existingAlert) {
      this.logger.log(
        `Alert already exists for call ${call_id} with type ${alert_data.level}`,
      );
      return;
    }

    await this.createAlert({
      organizationId: call.organization_id,
      patientId: call.patient_id,
      alertType: alert_data.level,
      severity: severity,
      message: alert_data.message,
      callId: call.id,
      callRunId: call.call_run_id,
      trigger: 'AI Generated',
      scriptId: call.script_id,
    });

    return;
  }
}

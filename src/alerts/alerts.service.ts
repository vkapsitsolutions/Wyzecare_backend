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
import { Repository, Not, Brackets } from 'typeorm';
import { Alert, AlertSeverity, AlertStatus } from './entites/alert.entity';
import { AlertAction, AlertHistory } from './entites/alert-history.entity';
import { GetAlertsDto } from './dto/get-alerts.dto';
import { User } from 'src/users/entities/user.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { UpdateAlertStatusDto } from './dto/update-status.dto';
import { AlertWebhookPayload } from 'src/webhooks/types/alert-webhook-payload';
import { CallsService } from 'src/calls/calls.service';

export interface CreateAlertPayload {
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
        trigger: dto.trigger ?? 'System Generated',
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
   * Get dashboard counts for total, active (by severity), and resolved alerts.
   */
  async getDashboardCounts() {
    const totalAlerts = await this.alertsRepository.count();

    const resolvedAlerts = await this.alertsRepository.count({
      where: { status: AlertStatus.RESOLVED },
    });

    const activeTotal = await this.alertsRepository.count({
      where: { status: Not(AlertStatus.RESOLVED) },
    });

    const activeCritical = await this.alertsRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        severity: AlertSeverity.CRITICAL,
      },
    });

    const activeImportant = await this.alertsRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        severity: AlertSeverity.IMPORTANT,
      },
    });

    const activeInformational = await this.alertsRepository.count({
      where: {
        status: Not(AlertStatus.RESOLVED),
        severity: AlertSeverity.INFORMATIONAL,
      },
    });

    return {
      success: true,
      message: 'Alerts Counts fetched',
      data: {
        totalAlerts,
        activeAlerts: {
          total: activeTotal,
          critical: activeCritical,
          important: activeImportant,
          informational: activeInformational,
        },
        resolvedAlerts,
      },
    };
  }

  /**
   * Find alerts with pagination and filters.
   * Includes patient relation for display purposes.
   */
  async findAlerts(getAlertsDto: GetAlertsDto, loggedInUser?: User) {
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
      .leftJoinAndSelect('alert.patient', 'patient')
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
      qb.andWhere('alert.createdAt >= :startDate', {
        startDate: startDate,
      });
    }

    if (endDate) {
      qb.andWhere('alert.createdAt <= :endDate', { endDate: endDate });
    }

    if (patientId) {
      qb.andWhere('alert.patientId = :patientId', { patientId });
    }

    // user patient access check: restrict to patients the user has access to,
    // unless the user is an administrator.
    if (loggedInUser && loggedInUser.role?.slug !== RoleName.ADMINISTRATOR) {
      // join the patient -> usersWithAccess relation and require the logged-in user id
      // to be present. This turns the results into only alerts for patients the user
      // has explicit access to.
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

    return {
      success: true,
      message: 'Alerts fetched',
      total,
      page,
      limit,
      totalPages,
      alerts,
    };
  }

  async getAlertDetails(id: string, loggedInUser?: User) {
    const qb = this.alertsRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.patient', 'patient')
      .leftJoinAndSelect('alert.acknowledgedBy', 'acknowledgedBy')
      .leftJoinAndSelect('alert.resolvedBy', 'resolvedBy')
      .leftJoinAndSelect('alert.script', 'script')
      .leftJoinAndSelect('alert.callRun', 'callRun')
      .leftJoinAndSelect('alert.call', 'call')
      .where('alert.id = :id', { id });

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
  async getAlertHistory(alertId: string) {
    const alertHistory = await this.historyRepository.find({
      where: { alertId },
      order: { createdAt: 'DESC' },
      relations: ['actorUser'],
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

    await this.createAlert({
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

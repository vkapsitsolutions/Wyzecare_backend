import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  DeliveryStatusLog,
  SmsStatus,
} from './entities/delivery-status-logs.entity';
import { GetDeliveryStatusLogsDto } from './dto/get-delivery-status-logs.dto';

@Injectable()
export class DeliveryStatusLogsService {
  constructor(
    @InjectRepository(DeliveryStatusLog)
    private readonly deliveryStatusLogRepository: Repository<DeliveryStatusLog>,
  ) {}

  async create(
    alertId: string,
    userId: string | null,
    phoneNumber: string,
    twilioSid: string,
    message: string,
  ): Promise<DeliveryStatusLog> {
    const deliveryStatusLog = this.deliveryStatusLogRepository.create({
      alertId,
      user_id: userId || null,
      phoneNumber,
      twilioSid,
      status: SmsStatus.SENT,
      message,
      sentAt: new Date(),
    });
    return this.deliveryStatusLogRepository.save(deliveryStatusLog);
  }

  async updateStatusBySid(
    twilioSid: string,
    status: SmsStatus,
    error?: string | null,
  ): Promise<DeliveryStatusLog | null> {
    const deliveryStatusLog = await this.deliveryStatusLogRepository.findOne({
      where: { twilioSid },
    });
    if (!deliveryStatusLog) {
      return null;
    }
    deliveryStatusLog.status = status;
    deliveryStatusLog.error = error || null;
    deliveryStatusLog.statusUpdatedAt = new Date();
    return this.deliveryStatusLogRepository.save(deliveryStatusLog);
  }

  async getByOrganization(
    organizationId: string,
    query: GetDeliveryStatusLogsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const userId = query.userId;
    const keyword = query.keyword?.trim();

    const qb = this.deliveryStatusLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.organization_id = :organizationId', { organizationId });

    if (userId) {
      qb.andWhere('log.user_id = :userId', { userId });
    }

    if (keyword && keyword.length > 0) {
      const kw = `%${keyword}%`;
      qb.andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('log.phone_number ILIKE :kw', { kw })
            .orWhere('log.twilio_sid ILIKE :kw', { kw })
            .orWhere('log.message ILIKE :kw', { kw })
            .orWhere('log.error ILIKE :kw', { kw });
        }),
      );
    }

    qb.orderBy('log.createdAt', 'DESC');

    const take = Math.max(1, Number(limit));
    const skip = (Math.max(1, Number(page)) - 1) * take;
    qb.skip(skip).take(take);

    const [logs, total] = await qb.getManyAndCount();

    const totalPages = total === 0 ? 0 : Math.ceil(total / take);

    return {
      success: true,
      message: 'Delivery logs fetched',
      total,
      page: Number(page),
      limit: take,
      totalPages,
      data: logs,
    };
  }
}

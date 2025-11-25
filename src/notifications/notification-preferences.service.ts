import { Injectable } from '@nestjs/common';
import { NotificationPreference } from './entities/notification-preferences.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertSeverity } from 'src/alerts/entities/alert.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private prefRepository: Repository<NotificationPreference>,
  ) {}

  async getOrCreatePreference(userId: string, smsEnabled = true) {
    let pref = await this.prefRepository.findOne({
      where: { user_id: userId },
    });

    if (!pref) {
      pref = this.prefRepository.create({
        user_id: userId,

        enabled_severity_levels: [
          AlertSeverity.INFORMATIONAL,
          AlertSeverity.IMPORTANT,
          AlertSeverity.CRITICAL,
        ],
        sms_enabled: smsEnabled,
        sms_opted_out: false,
      });
      await this.prefRepository.save(pref);
    }

    return {
      success: true,
      message: 'Notification preference created successfully',
      data: pref,
    };
  }

  async updatePreference(userId: string, updateData: UpdatePreferencesDto) {
    const { data: pref } = await this.getOrCreatePreference(userId);

    Object.assign(pref, updateData);
    await this.prefRepository.save(pref);

    return {
      success: true,
      message: 'Notification preference updated successfully',
      data: pref,
    };
  }

  async toggleSms(userId: string) {
    const { data: pref } = await this.getOrCreatePreference(userId);

    if (!pref.sms_enabled) {
      pref.sms_enabled = true;
      pref.sms_opted_out = false;
      pref.opted_out_at = null;
    } else {
      pref.sms_enabled = false;
    }

    await this.prefRepository.save(pref);

    return {
      success: true,
      message: `SMS notifications ${pref.sms_enabled ? 'enabled' : 'disabled'} successfully`,
    };
  }

  async optOutSms(userId: string): Promise<NotificationPreference> {
    const { data: pref } = await this.getOrCreatePreference(userId);
    pref.sms_enabled = false;
    pref.sms_opted_out = true;
    pref.opted_out_at = new Date();
    return this.prefRepository.save(pref);
  }

  async shouldSendSmsAlert(
    user: User,
    severity: AlertSeverity,
  ): Promise<boolean> {
    if (!user.phone || !user.phone_verified) {
      return false;
    }

    const { data: pref } = await this.getOrCreatePreference(user.id);

    if (!pref.sms_enabled) {
      return false;
    }

    if (pref.sms_opted_out) {
      return false;
    }

    if (!pref.enabled_severity_levels.includes(severity)) {
      return false;
    }

    return true;
  }
}

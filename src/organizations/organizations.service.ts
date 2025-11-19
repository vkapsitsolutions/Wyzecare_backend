import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import {
  DateFormatEnum,
  LanguageEnum,
  TimezoneEnum,
} from './enums/organization.enum';
import { timezoneLabelMap } from 'src/common/helpers/time-zone-mapper';
import { USER_TYPE } from 'src/users/enums/user-type.enum';
import { PatientsService } from 'src/patients/patients.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { DYNAMIC_TEMPLATES } from 'src/email/templates/email-templates.enum';

@Injectable()
export class OrganizationsService {
  private stripe: Stripe;
  private stripeSecretKey: string;
  private readonly logger = new Logger(OrganizationsService.name);
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepo: Repository<Organization>,

    private readonly patientsService: PatientsService,

    private readonly configService: ConfigService,

    private readonly emailService: EmailService,
  ) {
    this.stripeSecretKey =
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(this.stripeSecretKey);
  }

  async createOrganization(user: User, organizationType?: USER_TYPE) {
    if (user.organization) {
      if (organizationType) {
        user.organization.organization_type = organizationType;
        await this.organizationsRepo.save(user.organization);
      }
      return user.organization;
    }
    const newOrg = this.organizationsRepo.create({
      name: `${user.first_name}'s Organization`,
    });

    if (organizationType) {
      newOrg.organization_type = organizationType;
    }

    const savedOrg = await this.organizationsRepo.save(newOrg);

    // setting stripe customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.fullName,
      business_name: savedOrg.name,
      metadata: { organization_id: savedOrg.id },
    });
    const stripeCustomerId = customer.id;

    const savedWithStripeCustomer = await this.setStripeCustomer(
      savedOrg,
      stripeCustomerId,
    );

    await this.createTrialPromoForOrg(savedWithStripeCustomer, user);

    return savedOrg;
  }

  async getOneOrganization(id: string) {
    const organization = await this.organizationsRepo.findOne({
      where: { id },
      relations: ['subscriptions'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      success: true,
      message: 'Organization retrieved successfully',
      data: organization,
    };
  }

  async getConfiguration(id: string) {
    const organization = await this.organizationsRepo.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return {
      success: true,
      message: 'Configuration fetched',
      data: {
        timezone: organization.timezone,
        date_format: organization.date_format,
        language: organization.language,
      },
    };
  }

  async updateConfiguration(id: string, updateDto: UpdateConfigurationDto) {
    const organization = await this.organizationsRepo.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    Object.assign(organization, updateDto);
    const updatedOrg = await this.organizationsRepo.save(organization);
    return {
      success: true,
      message: 'Configuration updated',
      data: {
        timezone: updatedOrg.timezone,
        date_format: updatedOrg.date_format,
        language: updatedOrg.language,
      },
    };
  }

  getTimezoneOptions() {
    return Object.values(TimezoneEnum).map((value) => ({
      value,
      label: timezoneLabelMap[value],
    }));
  }

  getDateFormats() {
    return Object.values(DateFormatEnum);
  }

  getLanguageOptions() {
    return Object.values(LanguageEnum);
  }

  async setStripeCustomer(
    organization: Organization,
    stripeCustomerId: string,
  ) {
    organization.stripe_customer_id = stripeCustomerId;

    return await this.organizationsRepo.save(organization);
  }

  async createTrialPromoForOrg(organization: Organization, orgAdmin: User) {
    const amountOffCents = Math.max(
      0,
      Math.round((organization.custom_monthly_price ?? 49.99) * 100),
    );

    // 1) create coupon
    const coupon = await this.stripe.coupons.create({
      amount_off: amountOffCents,
      duration: 'once',
      currency: 'usd',
      name: `Test coupon`,
      metadata: { organizationId: organization.id },
    });

    // 2) create promotion code limited to one redemption (and only to this customer)
    const promoParams: Stripe.PromotionCodeCreateParams = {
      promotion: { type: 'coupon', coupon: coupon.id },
      // code: `ORG-${orgId}-TRIAL`, // or leave blank for random
      max_redemptions: 1,
      metadata: { organizationId: organization.id },
    };

    if (organization.stripe_customer_id) {
      promoParams.customer = organization.stripe_customer_id;
    }

    const promo = await this.stripe.promotionCodes.create(promoParams);

    organization.test_coupon_id = coupon.id;
    organization.test_promo_code_id = promo.id;
    organization.coupon_notified = false;

    await this.emailService.sendMail(
      orgAdmin.email,
      {
        recipient_name: orgAdmin.fullName,
        organization_name: organization.name,
        coupon_code: promo.code,
        max_redemptions: 1,
        instructions: 'Copy and paste this coupon code at the time of checkout',
        support_email: 'support@wyze.care',
        app_name: 'WyzeCare',
        current_year: new Date().getFullYear(),
      },
      DYNAMIC_TEMPLATES.COUPON_CODE_TEMPLATE_KEY,
    );

    await this.organizationsRepo.save(organization);
  }

  async markCouponNotified(organizationId: string) {
    const organization = await this.organizationsRepo.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization not found`);
    }

    organization.coupon_notified = true;

    await this.organizationsRepo.save(organization);

    return {
      success: true,
      message: 'User notified about coupon',
    };
  }

  async getMinimumLicensesToPurchase(organizationId: string) {
    const totalPatients =
      await this.patientsService.getPatientCount(organizationId);

    return totalPatients;
  }

  /**
   * Buffer-aware license usage for adding patients and UI display.
   * Use this in PatientsService.addPatient and Patient Overview.
   */
  async getExtendedLicenseUsage(organizationId: string) {
    const organization = await this.organizationsRepo.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    const { totalPatients: patientCount } =
      await this.patientsService.getPatientCount(organizationId);

    // Strict usage (existing)
    const strictAvailable = organization.licensed_patient_count - patientCount;

    // Buffer calculation
    const eligibleForBuffer = organization.licensed_patient_count >= 5;
    const bufferSize = this.calculateBufferSize(
      organization.licensed_patient_count,
    );
    const totalAllowed = organization.licensed_patient_count + bufferSize;
    const availableIncludingBuffer = Math.max(0, totalAllowed - patientCount);
    const graceUsed = Math.max(
      0,
      patientCount - organization.licensed_patient_count,
    );
    const remainingBuffer = Math.max(0, bufferSize - graceUsed);
    const isUsingBuffer = graceUsed > 0;

    return {
      // Strict (for reduces, existing checks)
      licensed_patient_count: organization.licensed_patient_count,
      used_patient_licenses: patientCount,
      available_patient_licenses: strictAvailable, // licensed - used (can be negative if over)

      // Buffer-aware (for adds, UI)
      buffer_size: bufferSize,
      eligible_for_buffer: eligibleForBuffer,
      total_allowed: totalAllowed,
      available_including_buffer: availableIncludingBuffer,
      grace_used: graceUsed,
      remaining_buffer: remainingBuffer,
      is_using_buffer: isUsingBuffer,
    };
  }

  /**
   * Calculate buffer size: max(5, 5% of licensed_patient_count) if eligible (>=5 licenses).
   */
  calculateBufferSize(licensedPatientCount: number): number {
    if (licensedPatientCount < 5) {
      return 0;
    }
    const percentageBuffer = Math.floor(licensedPatientCount * 0.05);
    return Math.max(5, percentageBuffer);
  }
}

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ListOrganizationsDto } from 'src/organizations/dto/list-organizations.dto';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RoleName } from 'src/roles/enums/roles-permissions.enum';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UploadsService } from 'src/uploads/uploads.service';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { RepricingLogService } from './subscriptions/repricing-logs.service';
import { User } from 'src/users/entities/user.entity';
import { EmailService } from 'src/email/email.service';
import { UsersService } from 'src/users/users.service';
import { DYNAMIC_TEMPLATES } from 'src/email/templates/email-templates.enum';

@Injectable()
export class SuperAdminService {
  private stripe: Stripe;
  private stripeSecretKey: string;
  private stripeProductId: string;
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepo: Repository<Organization>,

    private readonly uploadsService: UploadsService,

    private readonly subscriptionsService: SubscriptionsService,

    private readonly configService: ConfigService,

    private readonly repricingLogsService: RepricingLogService,

    private readonly emailService: EmailService,

    private readonly usersService: UsersService,
  ) {
    this.stripeSecretKey =
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(this.stripeSecretKey);

    this.stripeProductId = this.configService.getOrThrow('STRIPE_PRODUCT_ID');
  }

  async listAllOrganizations(listOrganizationsDto: ListOrganizationsDto) {
    const { limit = 10, page = 1, keyword } = listOrganizationsDto;

    const perPage = Number(limit) > 0 ? Number(limit) : 10;
    const pageNum = Number(page) > 0 ? Number(page) : 1;

    const qb = this.organizationsRepo
      .createQueryBuilder('organization')
      .distinct(true) // avoid duplicates caused by joins
      .leftJoinAndSelect('organization.users', 'users')
      .leftJoin('users.role', 'role')
      .where('role.slug = :adminRole', { adminRole: RoleName.ADMINISTRATOR });

    if (keyword && String(keyword).trim().length > 0) {
      const kw = `%${String(keyword).trim()}%`;
      qb.andWhere(
        `(
         organization.name ILIKE :kw
         OR users.first_name ILIKE :kw
         OR users.last_name ILIKE :kw
         OR users.email ILIKE :kw
       )`,
        { kw },
      );
    }

    qb.orderBy('organization.created_at', 'DESC')
      .take(perPage)
      .skip((pageNum - 1) * perPage);

    const [organizations, total] = await qb.getManyAndCount();

    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);

    const data = await Promise.all(
      organizations.map(async (org: Organization) => {
        const admins = org.users ?? [];
        const copy = { ...org, admins };
        if (copy.admins.length) {
          for (const admin of admins) {
            if (admin?.photo) {
              const photoUrl = await this.uploadsService.getFile(admin.photo);
              admin.photo = photoUrl ?? '';
            }
          }
        }
        delete copy.users;
        return copy;
      }),
    );

    return {
      success: true,
      message: 'Organizations fetched',
      total,
      page: pageNum,
      limit: perPage,
      totalPages,
      data,
    };
  }

  async getOneOrganization(organizationId: string) {
    const organization = await this.organizationsRepo.findOne({
      where: { id: organizationId },
      relations: { users: { role: true } },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization not found with id ${organizationId}`,
      );
    }

    if (organization.users?.length) {
      for (const user of organization.users) {
        if (user.photo) {
          const photoUrl = await this.uploadsService.getFile(user.photo);

          user.photo = photoUrl ?? '';
        }
      }
    }

    const { data } =
      await this.subscriptionsService.getSubscriptionStatus(organizationId);

    return {
      success: true,
      organization,
      activeSubscription: data ? data : null,
    };
  }

  async setCustomPrice(
    organizationId: string,
    customMonthlyPrice: number,
    loggedInAdmin: User,
  ) {
    const { organization, activeSubscription } =
      await this.getOneOrganization(organizationId);

    // for reprice logging
    const oldPriceId: string | undefined =
      organization.custom_monthly_price_id ?? undefined;
    const oldMonthlyPrice: number | undefined =
      organization.custom_monthly_price ?? 49.99; // default price;

    const amountCents = Math.max(0, Math.round(customMonthlyPrice * 100));
    const currency = 'usd';
    const interval = 'month';

    // Try to find an existing price that matches the required specs
    const existingPrices = await this.stripe.prices.list({
      product: this.stripeProductId,
      limit: 100, // increase/paginate if necessary
      active: true,
    });

    const matchingPrice = existingPrices.data.find(
      (p) =>
        p.unit_amount === amountCents &&
        p.currency === currency &&
        p.recurring?.interval === interval,
    );

    let price: Stripe.Price;
    if (matchingPrice) {
      price = matchingPrice;
    } else {
      // No exact match — create a new Price
      price = await this.stripe.prices.create({
        unit_amount: amountCents,
        currency,
        recurring: { interval },
        product: this.stripeProductId,
        metadata: { created_for_org: organization.id.toString() },
        nickname: `Org ${organization.id} custom ${amountCents}`,
      });
    }

    // Persist organization custom price info
    organization.custom_monthly_price = customMonthlyPrice;
    organization.custom_monthly_price_id = price.id;
    organization.custom_price_assigned = true;

    // If active subscription exists, switch to the new/reused price
    if (activeSubscription?.stripe_subscription_id) {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        activeSubscription.stripe_subscription_id,
      );

      // Find the subscription item to update (assumes single item)
      const subscriptionItemId = stripeSubscription.items.data[0]?.id;
      if (!subscriptionItemId) {
        throw new InternalServerErrorException('No subscription items found');
      }

      await this.stripe.subscriptions.update(
        activeSubscription.stripe_subscription_id,
        {
          items: [
            {
              id: subscriptionItemId,
              price: price.id,
              quantity: organization.licensed_patient_count,
            },
          ],
          proration_behavior: 'always_invoice',
        },
      );
    }

    await this.organizationsRepo.save(organization);

    const orgAdmins =
      await this.usersService.findOrganizationAdmins(organizationId);

    for (const user of orgAdmins) {
      await this.emailService.sendMail(
        user.email,
        {
          recipient_name: user.fullName,
          organization_name: organization.name,
          admin_name: loggedInAdmin.fullName,
          old_monthly_price: oldMonthlyPrice,
          new_monthly_price: customMonthlyPrice,
          licensed_patient_count: activeSubscription
            ? organization.licensed_patient_count
            : 0,
          effective_date: `${new Date().toLocaleString('en-US', {
            timeZone: 'UTC',
          })} UTC`,
          frontend_url: `${this.configService.getOrThrow<string>('FRONTEND_URL')}/settings`,
          support_email: 'support@wyze.care',
          app_name: 'WyzeCare',
          current_year: new Date().getFullYear(),
        },
        DYNAMIC_TEMPLATES.REPRICING_TEMPLATE_KEY,
      );
    }

    await this.repricingLogsService.createLog({
      organizationId: organizationId,
      newMonthlyPrice: customMonthlyPrice,
      oldMonthlyPrice: oldMonthlyPrice,
      oldPriceId: oldPriceId,
      newPriceId: price.id,
      adminId: loggedInAdmin.id,
      notes: `Monthly price updated  for ${organization.name}`,
    });

    return {
      success: true,
      message: 'Custom price set successfully',
      data: {
        custom_price_id: price.id,
        custom_monthly_price: customMonthlyPrice,
        prorated_invoice_created: !!activeSubscription?.stripe_subscription_id,
        reused_existing_price: !!matchingPrice,
      },
    };
  }
}

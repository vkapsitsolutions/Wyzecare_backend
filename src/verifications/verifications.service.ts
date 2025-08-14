import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Verification,
  VerificationStatus,
  VerificationType,
} from './entitiies/verification.entity';
import generateOtpAndExpiry from 'src/common/helpers/otp-generate';
import { EmailService } from 'src/email/email.service';
import * as crypto from 'crypto';
import { DYNAMIC_TEMPLATES } from 'src/email/templates/email-templates.enum';
import { InitiateVerificationDto } from './dto/initiate-verification.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserUtilsService } from 'src/users/users-utils.service';

@Injectable()
export class VerificationsService {
  private logger = new Logger(VerificationsService.name);
  private readonly MAX_OTP_ATTEMPTS = 5;

  constructor(
    private readonly userUtilsService: UserUtilsService,
    @InjectRepository(Verification)
    private readonly verificationsRepository: Repository<Verification>,
    protected readonly emailService: EmailService,
  ) {}

  async findLatestByEmail(email: string, type?: VerificationType) {
    return this.verificationsRepository.findOne({
      where: type
        ? { email: email.toLowerCase().trim(), type }
        : { email: email.toLowerCase().trim() },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Initiate email verification:
   * - ensure email not already tied to a user
   * - generate OTP, hash it, store token_hash + expires_at
   * - create or update verification_tokens row with type EMAIL_OTP
   * - send OTP email via EmailService
   */
  async initiateVerification(initiateVerificationDto: InitiateVerificationDto) {
    const { email } = initiateVerificationDto;
    const existingUser = await this.userUtilsService.checkEmailExists(email);
    if (existingUser) {
      throw new ConflictException('Email already taken');
    }

    const { otp, otpExpires } = generateOtpAndExpiry();

    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

    try {
      let verification = await this.findLatestByEmail(email);

      if (verification) {
        verification.token_hash = tokenHash;
        verification.expires_at = otpExpires;
        verification.status = VerificationStatus.PENDING;
        verification.attempts = 0;
        verification.type = VerificationType.EMAIL_OTP;
        verification.email = email;
        await this.verificationsRepository.save(verification);
      } else {
        const newVerification = this.verificationsRepository.create({
          email,
          type: VerificationType.EMAIL_OTP,
          token_hash: tokenHash,
          expires_at: otpExpires,
          status: VerificationStatus.PENDING,
          attempts: 0,
        });
        verification = await this.verificationsRepository.save(newVerification);
      }

      const expiryMinutes = Math.max(
        1,
        Math.ceil((+otpExpires - Date.now()) / 60000),
      );

      await this.emailService.sendOtpMail(
        email,
        {
          app_name: 'WyzeCare',
          current_year: 2025,
          expiry_minutes: expiryMinutes,
          otp,
          support_email: 'support@example.com',
        },
        DYNAMIC_TEMPLATES.OTP_TEMPLATE_KEY,
      );

      return {
        success: true,
        message: 'OTP sent successfully',
      };
    } catch (err) {
      this.logger.error(`initiateVerification error:, ${err}`);
      throw new InternalServerErrorException('Failed to initiate verification');
    }
  }

  /**
   * Validate OTP for signup flow.
   * Does NOT mark the verification as used or delete it — it simply validates and returns the verification id.
   * Caller is expected to create the user and then delete the verification record.
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp: submittedOtp } = verifyOtpDto;

    const verification = await this.verificationsRepository.findOne({
      where: { email, type: VerificationType.EMAIL_OTP },
      order: { created_at: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (verification.status === VerificationStatus.APPROVED) {
      throw new BadRequestException('Email already verified');
    }

    if (verification.status === VerificationStatus.REJECTED) {
      throw new BadRequestException('Invalid or expired otp');
    }

    if (
      !verification.expires_at ||
      verification.expires_at.getTime() < Date.now()
    ) {
      verification.status = VerificationStatus.REJECTED;
      await this.verificationsRepository.save(verification).catch((e) => {
        this.logger.warn('Could not mark expired verification used', e);
      });
      throw new BadRequestException('OTP expired');
    }

    // hash submitted OTP the same way we generated token_hash
    const submittedHash = crypto
      .createHash('sha256')
      .update(submittedOtp)
      .digest('hex');

    if (submittedHash !== verification.token_hash) {
      verification.attempts = (verification.attempts || 0) + 1;

      if (verification.attempts >= this.MAX_OTP_ATTEMPTS) {
        verification.status = VerificationStatus.REJECTED; // lock on too many attempts
      }

      await this.verificationsRepository.save(verification).catch((e) => {
        this.logger.warn('Failed to update verification attempts', e);
      });

      throw new BadRequestException('Invalid OTP');
    } else {
      verification.status = VerificationStatus.APPROVED;
      await this.verificationsRepository.save(verification);
    }

    return {
      success: true,
      message: 'OTP verified',
      verificationId: verification.id,
      email: verification.email,
    };
  }

  // deleting a verification record
  async deleteVerification(verificationId: string) {
    await this.verificationsRepository.delete({ id: verificationId });
  }
}

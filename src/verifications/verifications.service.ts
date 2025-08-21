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
import { InitiatePasswordResetDto } from 'src/auth/dto/initiate-password-reset.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VerificationsService {
  private logger = new Logger(VerificationsService.name);
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly frontendUrl: string;

  constructor(
    private readonly userUtilsService: UserUtilsService,
    @InjectRepository(Verification)
    private readonly verificationsRepository: Repository<Verification>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  private readonly RESET_TOKEN_EXPIRY_MINUTES = 60; // 1 hour expiry

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

      await this.emailService.sendMail(
        email,
        {
          app_name: 'WyzeCare',
          current_year: new Date().getFullYear(),
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

  /**
   * Initiate password reset:
   * - Check if user exists for the email
   * - Generate a secure random token, hash it, store in verification_tokens with type PASSWORD_RESET
   * - Send reset link email via EmailService
   */
  async initiatePasswordReset(
    initiatePasswordResetDto: InitiatePasswordResetDto,
  ) {
    const { email } = initiatePasswordResetDto;
    const normalizedEmail = email.toLowerCase().trim();

    const user =
      await this.userUtilsService.findByEmailForInternal(normalizedEmail);
    if (!user) {
      this.logger.warn('Trying to recover not existing account, link not sent');
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      };
    }

    // Generate a secure random token (e.g., 32 bytes hex)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(
      Date.now() + this.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    try {
      const existingVerification = await this.verificationsRepository.findOne({
        where: {
          user_id: user.id,
          type: VerificationType.PASSWORD_RESET,
        },
        order: { created_at: 'DESC' },
      });

      if (existingVerification) {
        existingVerification.token_hash = tokenHash;
        existingVerification.expires_at = expiresAt;
        existingVerification.attempts = 0;
        existingVerification.status = VerificationStatus.PENDING;
        existingVerification.attempts = 0;

        await this.verificationsRepository.save(existingVerification);
      } else {
        const newVerification = this.verificationsRepository.create({
          user: user,
          user_id: user.id,
          email: normalizedEmail,
          type: VerificationType.PASSWORD_RESET,
          token_hash: tokenHash,
          expires_at: expiresAt,
          status: VerificationStatus.PENDING,
          attempts: 0,
        });
        await this.verificationsRepository.save(newVerification);
      }

      const resetLink = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`;

      await this.emailService.sendMail(
        normalizedEmail,
        {
          app_name: 'WyzeCare',
          current_year: 2025,
          expiry_minutes: this.RESET_TOKEN_EXPIRY_MINUTES,
          reset_link: resetLink,
          support_email: 'support@example.com',
        },
        DYNAMIC_TEMPLATES.PASSWORD_RESET_TEMPLATE_KEY,
      );

      return {
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      };
    } catch (err) {
      this.logger.error(`initiatePasswordReset error: ${err}`);
      throw new InternalServerErrorException(
        'Failed to initiate password reset',
      );
    }
  }

  /**
   * Validate reset token (does NOT update password — caller handles that).
   * Returns the verification if valid.
   */
  async validateResetToken(
    email: string,
    submittedToken: string,
  ): Promise<Verification> {
    const normalizedEmail = email.toLowerCase().trim();

    const verification = await this.verificationsRepository.findOne({
      where: { email: normalizedEmail, type: VerificationType.PASSWORD_RESET },
      order: { created_at: 'DESC' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Reset link already used or expired');
    }

    if (
      verification.expires_at &&
      verification.expires_at.getTime() < Date.now()
    ) {
      verification.status = VerificationStatus.REJECTED;
      await this.verificationsRepository.save(verification).catch((e) => {
        this.logger.warn('Could not mark expired verification rejected', e);
      });
      throw new BadRequestException('Reset link expired');
    }

    const submittedHash = crypto
      .createHash('sha256')
      .update(submittedToken)
      .digest('hex');

    if (submittedHash !== verification.token_hash) {
      verification.attempts = (verification.attempts || 0) + 1;
      if (verification.attempts >= this.MAX_OTP_ATTEMPTS) {
        verification.status = VerificationStatus.REJECTED;
      }
      await this.verificationsRepository.save(verification).catch((e) => {
        this.logger.warn('Failed to update verification attempts', e);
      });
      throw new BadRequestException('Invalid reset link');
    }

    return verification;
  }
}

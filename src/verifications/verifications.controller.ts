import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { InitiateVerificationDto } from './dto/initiate-verification.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { InitiatePhoneVerificationDto } from './dto/initiate-phone-verification.dto';
import { ConfirmPhoneOtpDto } from './dto/confirm-phone-otp.dto';

@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}

  @Post('initiate')
  initiateVerification(
    @Body() initiateVerificationDto: InitiateVerificationDto,
  ) {
    return this.verificationsService.initiateVerification(
      initiateVerificationDto,
    );
  }

  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.verificationsService.verifyOtp(verifyOtpDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() initiateForgotPasswordDto: InitiateVerificationDto) {
    return this.verificationsService.initiatePasswordReset(
      initiateForgotPasswordDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('initiate-phone-verification')
  initiatePhoneVerification(
    @Body() initiateVerificationDto: InitiatePhoneVerificationDto,
    @CurrentUser() user: User,
  ) {
    return this.verificationsService.initiatePhoneNumberVerification(
      initiateVerificationDto,
      user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-phone-otp')
  confirmPhoneNumberV2(
    @Body() confirmPhoneOtpDto: ConfirmPhoneOtpDto,
    @CurrentUser() user: User,
  ) {
    return this.verificationsService.confirmPhoneNumber(
      confirmPhoneOtpDto,
      user,
    );
  }
}

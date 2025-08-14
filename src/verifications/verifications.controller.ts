import { Body, Controller, Post } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { InitiateVerificationDto } from './dto/initiate-verification.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

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
}

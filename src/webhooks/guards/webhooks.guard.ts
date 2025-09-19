import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret =
      this.configService.getOrThrow<string>('WEBHOOK_SECRET');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-webhook-secret'] as string;

    if (!providedSecret || providedSecret !== this.webhookSecret) {
      throw new BadRequestException('Invalid or missing webhook secret');
    }

    return true;
  }
}

import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { InitiateCallPayload } from './payloads/initiate-call.payload';

@Injectable()
export class AiCallingService {
  private logger = new Logger(AiCallingService.name);

  private readonly callingServiceUrl: string;
  private readonly callingServiceToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.callingServiceUrl = this.configService.getOrThrow<string>(
      'CALLING_SERVICE_URI',
    );
    this.callingServiceToken = this.configService.getOrThrow<string>(
      'CALLING_SERVICE_TOKEN',
    );
  }

  async initiateCall(payload: InitiateCallPayload) {
    const url = `${this.callingServiceUrl}/create_phone_call`;

    const body = payload;

    const response = await firstValueFrom(
      this.httpService
        .post<{ data: unknown }>(url, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.callingServiceToken}`,
          },
        })
        .pipe(
          catchError((error) => {
            this.logger.error(error);
            throw new BadRequestException(
              'Could not initiate the call, please try again',
            );
          }),
        ),
    );
    const data = response.data as unknown;

    return data;
  }
}

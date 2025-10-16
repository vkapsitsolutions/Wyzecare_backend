import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { InitiateCallPayload } from './payloads/initiate-call.payload';
import { InitiateCallResponse } from './payloads/initiate-call.reponse';
import { CallPayload } from 'src/webhooks/types/webhooks-payload';

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

  /**
   * Initiates a call and returns the typed provider response.
   * Throws BadRequestException on transport or unexpected response.
   */
  async initiateCall(
    payload: InitiateCallPayload,
  ): Promise<InitiateCallResponse> {
    const url = `${this.callingServiceUrl}/create_phone_call`;

    const response = await firstValueFrom(
      this.httpService
        // tell HttpService what the body shape will be
        .post<InitiateCallResponse>(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.callingServiceToken}`,
          },
        })
        .pipe(
          catchError((error) => {
            this.logger.error('Calling service transport error', error);
            throw new BadRequestException(
              'Could not initiate the call, please try again',
            );
          }),
        ),
    );

    // response.data is typed as InitiateCallResponse
    const data = response.data;

    // basic validation to be safe
    if (!data || typeof data.call_id !== 'string' || !data.call_id) {
      this.logger.error('Unexpected response from calling service', data);
      throw new BadRequestException(
        'Calling service returned an unexpected response',
      );
    }

    return data;
  }

  async fetchCallDetails(externalCallId: string) {
    const url = `${this.callingServiceUrl}/get_status/${externalCallId}`;

    const response = await firstValueFrom(
      this.httpService
        // tell HttpService what the body shape will be
        .get<CallPayload>(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.callingServiceToken}`,
          },
        })
        .pipe(
          catchError((error) => {
            this.logger.error(`Calling service transport error:  ${error}`);
            throw new BadRequestException(
              'Could not initiate the call, please try again',
            );
          }),
        ),
    );

    return response.data;
  }
}

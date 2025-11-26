import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertSeverity } from 'src/alerts/entities/alert.entity';
import { capitalize } from 'src/common/helpers/capitalize';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio;
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.client = new Twilio(accountSid, authToken);
  }

  async sendAlertSms(
    phoneNumber: string,
    patientName: string,
    severity: AlertSeverity,
    alertType: string,
    message: string,
    portalLink: string,
  ): Promise<{
    sid: string | null;
    formattedMessage?: string;
    error?: string;
  }> {
    try {
      const formattedMessage = this.formatAlertMessage(
        severity,
        alertType,
        patientName,
        message,
        portalLink,
      );

      const baseUrl =
        this.configService.getOrThrow('NODE_ENV') === 'production'
          ? 'https://app.wyze.care'
          : 'https://staging.wyze.care';
      const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/sms-status`;

      const response = await this.client.messages.create({
        body: formattedMessage,
        from: this.configService.getOrThrow<string>(
          'TWILIO_MESSAGING_SERVICE_SID',
        ),
        to: phoneNumber,
        statusCallback: statusCallbackUrl,
      });

      this.logger.log(
        `SMS sent successfully. SID: ${response.sid}, To: ${phoneNumber}, Callback: ${statusCallbackUrl}`,
      );
      return { sid: response.sid, formattedMessage };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(
        `Failed to send SMS to ${phoneNumber}: ${errorMessage}`,
      );
      return { sid: null, error: errorMessage };
    }
  }

  private formatAlertMessage(
    severity: AlertSeverity,
    alertType: string,
    patientFirstName: string,
    message: string,
    portalLink: string,
  ): string {
    // Include alertType in prefix, keep it short
    const severityPrefix = capitalize(
      `WyzeCare ${severity}${alertType ? ` - ${alertType}` : ''}:`,
    );
    const content = `${patientFirstName} ${message}`;
    const link = `Details: ${portalLink}`;

    // Construct and check 160 character limit
    let fullMessage = `${severityPrefix} ${content} ${link}`;

    if (fullMessage.length > 160) {
      // Reserve room for: one space after prefix, ellipsis (3), one space before link
      // total fixed chars = severityPrefix.length + link.length + 5
      const maxContentLength = Math.max(
        0,
        160 - severityPrefix.length - link.length - 5,
      );

      if (maxContentLength > 0) {
        const truncatedContent = content.substring(0, maxContentLength).trim();
        fullMessage = `${severityPrefix} ${truncatedContent}... ${link}`;
      } else {
        // Rare case: prefix + link already take nearly all 160 chars.
        // Fall back to prefix + link (try to trim link if still too long).
        fullMessage = `${severityPrefix} ${link}`;
        if (fullMessage.length > 160) {
          // Trim link to fit within 160, leaving 3 chars for ellipsis
          const allowedLinkLen = 160 - severityPrefix.length - 1 - 3; // -1 for space, -3 for '...'
          const rawLink = link;
          const truncatedLink =
            allowedLinkLen > 0
              ? rawLink.substring(0, allowedLinkLen).trim() + '...'
              : '...';
          fullMessage = `${severityPrefix} ${truncatedLink}`;
        }
      }
    }

    return fullMessage;
  }
}

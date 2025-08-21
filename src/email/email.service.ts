import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGridMail from '@sendgrid/mail';
import { MailPayload } from './types/send-mail.payload';
import { DYNAMIC_TEMPLATES } from './templates/email-templates.enum';

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  constructor(private readonly configService: ConfigService) {
    SendGridMail.setApiKey(
      this.configService.getOrThrow<string>('SENDGRID_API_KEY'),
    );
  }

  async sendMail(
    toMail: string,
    templateData: MailPayload,
    templateId: DYNAMIC_TEMPLATES,
  ) {
    const mail: SendGridMail.MailDataRequired = {
      to: toMail,
      from: this.configService.getOrThrow<string>('SENDGRID_SENDER_MAIL'),
      templateId: templateId,
      dynamicTemplateData: templateData,
    };

    try {
      const transport = await SendGridMail.send(mail);

      return transport;
    } catch (err) {
      this.logger.error(err);
      return err as Error;
    }
  }
}

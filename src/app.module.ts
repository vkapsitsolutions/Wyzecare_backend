import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { UsersModule } from './users/users.module';
import typeorm from './config/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { VerificationsModule } from './verifications/verifications.module';
import { EmailModule } from './email/email.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SeederModule } from './seeder/seeder.module';
import { UploadsModule } from './uploads/uploads.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PatientsModule } from './patients/patients.module';
import { PatientConsentsModule } from './patient-consents/patient-consents.module';
import { CallScriptsModule } from './call-scripts/call-scripts.module';
import { AiCallingModule } from './ai-calling/ai-calling.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CallSchedulesModule } from './call-schedules/call-schedules.module';
import { CallsModule } from './calls/calls.module';
import { AlertsModule } from './alerts/alerts.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            messageKey: 'message',
          },
        },
        messageKey: 'message',
      },
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRES: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRES: Joi.string().required(),
        SENDGRID_API_KEY: Joi.string().required(),
        SENDGRID_SENDER_MAIL: Joi.string().required(),
        SUPER_ADMIN_EMAIL: Joi.string().required(),
        SUPER_ADMIN_PASSWORD: Joi.string().required(),
        FRONTEND_URL: Joi.string().required(),
        AWS_ACCESS_KEY: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_BUCKET_NAME: Joi.string().required(),
        AWS_BUCKET_REGION: Joi.string().required(),
        CALLING_SERVICE_URI: Joi.string().required(),
        CALLING_SERVICE_TOKEN: Joi.string().required(),
        WEBHOOK_SECRET: Joi.string().required(),
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_MONTHLY_PRICE_ID: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.getOrThrow('typeorm-config'),
    }),

    UsersModule,

    AuthModule,

    RolesModule,

    VerificationsModule,

    EmailModule,

    OrganizationsModule,

    SeederModule,

    UploadsModule,

    SubscriptionsModule,

    PatientsModule,

    PatientConsentsModule,

    CallScriptsModule,

    AiCallingModule,

    WebhooksModule,

    CallSchedulesModule,

    CallsModule,

    AlertsModule,

    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

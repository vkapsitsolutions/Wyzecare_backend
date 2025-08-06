import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { UsersModule } from './users/users.module';
import typeorm from './config/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';

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
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.getOrThrow('typeorm-config'),
    }),

    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

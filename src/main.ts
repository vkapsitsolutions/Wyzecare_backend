import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.setGlobalPrefix('api');

  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3000', 'https://wyze-care.vercel.app'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.use(helmet());
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  try {
    await app.listen(port);
    logger.log(
      `Application is running on: http://localhost:${port}`,
      'Bootstrap',
    );
  } catch (err) {
    logger.error(`Error starting the application: ${err}`, 'Bootstrap');
    process.exit(1);
  }
}
void bootstrap();

import { INestApplication, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { Server } from 'http';
import 'source-map-support/register';

// void is added to ignore floating promise eslint rule
void bootstrap();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  configureHttpServer(app);
  configureLogger(app);
  configureApiPrefix(app);
  configureApiVersioning(app);
  configureUnhandledErrorsHandling();
  await app.listen(process.env.PORT || 8080);
}

function configureHttpServer(app: INestApplication) {
  // ALB has default timeout of 60 seconds
  const httpAdapter = app.getHttpAdapter();
  const server: Server = httpAdapter.getHttpServer();
  server.keepAliveTimeout = 61 * 1000;
  server.headersTimeout = 65 * 1000;
}

function configureLogger(app: INestApplication) {
  const logger = app.get(Logger);
  app.useLogger(logger);
  console.trace = (message, ...context) => logger.verbose(message, context);
  console.debug = (message, ...context) => logger.debug(message, context);
  console.log = (message, ...context) => logger.log(message, context);
  console.info = (message, ...context) => logger.log(message, context);
  console.warn = (message, ...context) => logger.warn(message, context);
  console.error = (message, ...context) => logger.error(message, context);
}

function configureApiPrefix(app: INestApplication) {
  app.setGlobalPrefix('api');
}

function configureApiVersioning(app: INestApplication) {
  app.enableVersioning({
    type: VersioningType.URI,
  });
}

function configureUnhandledErrorsHandling() {
  process.on('unhandledRejection', (error) => {
    console.error(error);
  });
  process.on('uncaughtException', (error) => {
    console.error(error);
  });
}

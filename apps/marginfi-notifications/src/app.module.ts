import { Module } from '@nestjs/common';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { HttpModule } from '@nestjs/axios';
import { Dialect, DialectSdk, Environment } from '@dialectlabs/sdk';

import {
  NodeDialectSolanaWalletAdapter,
  Solana,
  SolanaSdkFactory,
} from '@dialectlabs/blockchain-sdk-solana';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';

import { HealthController } from './health.controller';
import { MonitoringService } from './monitoring.service';
import { AccountDataSource } from './marginfi-data-source';
import * as winston from 'winston';

// Define a custom log format
const stackdriverFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({ fillExcept: ['timestamp', 'level', 'message'] }),
  winston.format.printf(({ level, message, timestamp, metadata }) => {
    const stackdriverPayload = {
      severity: level,
      message: message,
      timestamp: timestamp,
      ...metadata,
    };
    return JSON.stringify(stackdriverPayload);
  }),
);

const prettyFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('health-notifier', {
    colors: true,
    prettyPrint: true,
  }),
);

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TerminusModule,
    HttpModule,
    CacheModule.register({
      ttl: Number(process.env.CACHE_TTL_MS) ?? 50_000, // milliseconds (50 seconds)
    }),
    ConfigModule.forRoot(),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format:
            process.env.ENVIRONMENT === 'local-development'
              ? prettyFormat
              : stackdriverFormat,
        }),
      ],
    }),
  ],
  controllers: [HealthController],
  providers: [
    AccountDataSource,
    MonitoringService,
    {
      provide: DialectSdk<Solana>,
      useValue: Dialect.sdk(
        {
          environment: process.env.DIALECT_SDK_ENVIRONMENT as Environment,
        },
        SolanaSdkFactory.create({
          // IMPORTANT: must set environment variable DIALECT_SDK_CREDENTIALS
          // to your dapp's Solana messaging wallet keypair e.g. [170,23, . . . ,300]
          wallet: NodeDialectSolanaWalletAdapter.create(),
        }),
      ),
    },
  ],
})
export class AppModule {}

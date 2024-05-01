import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TerminusModule,
    HttpModule,
    CacheModule.register(),
    ConfigModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: process.env.ENVIRONMENT !== 'production',
        redact: ['req.headers'],
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: process.env.ENVIRONMENT === 'local-development',
            translateTime: true,
            singleLine: true,
            ignore: 'pid,hostname',
          },
        },
      },
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

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DappMessageActionType, DialectSdk } from '@dialectlabs/sdk';
import {
  DialectSdkNotification,
  Monitors,
  Pipelines,
} from '@dialectlabs/monitor';
import { Solana } from '@dialectlabs/blockchain-sdk-solana';
import { Duration } from 'luxon';
import { StdoutNotificationSink } from './utils/StdoutNotificationSink';
import { AccountDataSource, AccountData } from './marginfi-data-source';

@Injectable()
export class MonitoringService implements OnApplicationBootstrap {
  private readonly stdoutNotificationSink = new StdoutNotificationSink();
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly sdk: DialectSdk<Solana>,
    private readonly dataSource: AccountDataSource,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log(`Initializing monitoring service...`);
    const monitor = this.createMonitor();
    monitor.start().catch(console.error);
    this.logger.log(`Monitoring service initialized.`);
  }

  createMonitor() {
    const monitor = Monitors.builder({
      subscribersCacheTTL: Duration.fromObject({ minutes: 5 }),
      sdk: this.sdk,
    })
      .defineDataSource<AccountData>()
      .poll(
        (subscribers) => this.dataSource.pollData(subscribers),
        Duration.fromObject({ seconds: 5 }),
      )
      .transform<number, number>({
        keys: ['healthFactor'],
        pipelines: [
          Pipelines.threshold({
            type: 'falling-edge',
            threshold: 0.75,
          }),
        ],
      })
      .notify({
        // optional, must be set if your dapp has at least one custom notification type
        type: {
          id: 'content_updates',
        },
      })
      .dialectSdk(
        ({ context: { origin } }) => {
          const notification: DialectSdkNotification = {
            title: `Your health factor fell below 0.25`,
            message: `The value of your health factor just dropped under 0.25. It is now ${origin.healthFactor}.`,
            actions: {
              type: DappMessageActionType.LINK,
              links: [
                {
                  label: 'View',
                  url: `https://www.google.com/search?q=0.25&oq=0.25`,
                },
              ],
            },
          };
          this.logger.log(
            `Sending notification to ${origin.subscriber}: ${JSON.stringify(
              notification,
            )}`,
          );
          return notification;
        },
        // this.stdoutNotificationSink,
        { dispatch: 'unicast', to: ({ origin }) => origin.subscriber },
      )
      //
      // FINISH
      //
      .and()
      .build();
    return monitor;
  }
}

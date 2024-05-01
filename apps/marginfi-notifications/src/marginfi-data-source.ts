import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { ResourceId, SourceData } from '@dialectlabs/monitor';
import { Cache } from '@nestjs/cache-manager';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from 'luxon';
import { chunk } from 'lodash';
import {
  connection,
  fetchMarginfiAccounts,
  getMinimumValue,
  transformAccountMap,
} from './utils/marginfi-account.utils';
import {
  Environment,
  MARGINFI_IDL,
  MarginfiAccountRaw,
  MarginfiClient,
  MarginfiProgram,
  getConfig,
} from '@mrgnlabs/marginfi-client-v2';

export type AccountData = {
  healthFactor: number;
  subscriber: ResourceId;
};

export interface MarginfiAccountMap {
  [key: string]: MarginfiAccountObject[];
}

export type MarginfiAccountObject = {
  key: string;
  account: MarginfiAccountRaw;
};

@Injectable()
export class AccountDataSource {
  constructor(private cacheManager: Cache) {}

  private readonly logger = new Logger(AccountDataSource.name);

  /**
   * Poll data for all subscribers, this function is called at a regular interval.
   * The function assumes that data is fetched separately for each subscriber from a remote network source.
   * Performance: to avoid potential rate limiting, the function fetches data for subscribers in chunks. Chunks are processed sequentially, but fetching data within a chunk is done in parallel.
   * Reliability: error fetching data for a single subscriber does not affect fetching data for other subscribers.
   * @param subscribers list of subscribers to fetch data for
   * @returns {Promise<SourceData<AccountData>[]>} a single array of data for all subscribers
   */
  async pollData(
    subscribers: ResourceId[],
  ): Promise<SourceData<AccountData>[]> {
    const config = getConfig(process.env.MRGN_ENV! as Environment);

    const client = await MarginfiClient.fetch(config, {} as any, connection);
    const now = new Date();
    const sourceData: SourceData<AccountData>[] = []; // Single array for data across all subscribers
    const chunkedSubscribers = chunk(subscribers, 10); // avoid potential rate limiting on RPC calls
    for (const chunk of chunkedSubscribers) {
      const accounts = await this.getMarginfiAccountData(chunk, client);

      accounts.forEach((userData) => {
        sourceData.push(userData);
      });
    }
    this.logger.log(
      `Elapsed ${Interval.fromDateTimes(now, new Date()).toDuration(
        'seconds',
      )} to poll data for ${subscribers.length} subscribers`,
    );
    console.log(sourceData);
    return sourceData;
  }

  /**
   * Fetch marginfi account data for all subscribers.
   * @param subscribers an array of public keys of the subscriber
   * @returns {Promise<SourceData<ExampleUserData>>} example user data
   */
  private async getMarginfiAccountData(
    subscribers: PublicKey[],
    client: MarginfiClient,
  ): Promise<SourceData<AccountData>[]> {
    const accounts = await this.getMarginfiAccounts(
      subscribers.map((v) => v.toBase58()),
    );
    if (!accounts) return [];

    const parsedAccounts = transformAccountMap(accounts, client);

    const sourceData: SourceData<AccountData>[] = subscribers.map(
      (subscriber) => ({
        data: {
          subscriber,
          healthFactor: getMinimumValue(
            parsedAccounts[subscriber.toBase58()]?.map(
              (v) => v.healthFactor,
            ) ?? [100],
          ),
        } as AccountData,

        groupingKey: subscriber.toBase58(),
      }),
    );

    return sourceData;
  }

  /**
   * Fetch marginfi account data for all subscribers.
   * @param subscribers an array of public keys of the subscriber
   * @returns {Promise<SourceData<ExampleUserData>>} example user data
   */
  private async getMarginfiAccounts(
    wallets: string[],
  ): Promise<MarginfiAccountMap | null> {
    const config = getConfig(process.env.MRGN_ENV! as Environment);
    const provider = new AnchorProvider(connection, {} as any, {
      ...AnchorProvider.defaultOptions(),
      commitment:
        connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(
      MARGINFI_IDL as any,
      config.programId,
      provider,
    ) as any as MarginfiProgram;

    const fetchAcc = async () => {
      const fetchedAccMap: MarginfiAccountMap = {};

      await Promise.all(
        wallets.map(async (key: string) => {
          const cacheKey = `key_${key}`;
          const cachedData = (await this.cacheManager.get(cacheKey)) as
            | MarginfiAccountObject[]
            | undefined;
          let fetchedData: MarginfiAccountObject[] = [];
          if (cachedData) {
            fetchedData = cachedData;
          } else {
            fetchedData = await fetchMarginfiAccounts(program, config, key);
            await this.cacheManager.set(cacheKey, fetchedData);
          }
          fetchedAccMap[key] = fetchedData;
        }),
      );

      return fetchedAccMap;
    };

    return await fetchAcc();
  }
}

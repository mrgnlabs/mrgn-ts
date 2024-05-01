import {
  MarginRequirementType,
  MarginfiClient,
  MarginfiAccountWrapper,
  MarginfiProgram,
  MarginfiConfig,
  MarginfiAccountRaw,
} from '@mrgnlabs/marginfi-client-v2';
import { PublicKey, Connection, Commitment } from '@solana/web3.js';
import {
  MarginfiAccountMap,
  MarginfiAccountObject,
} from 'src/marginfi-data-source';

type MarginfiSummaryAccount = {
  account: PublicKey;
  healthFactor: number;
};

export interface NotificationObjectMap {
  [key: string]: MarginfiSummaryAccount[];
}

export function transformAccountMap(
  originalMap: MarginfiAccountMap,
  client: MarginfiClient,
): NotificationObjectMap {
  const newMap: NotificationObjectMap = {};

  for (const groupKey in originalMap) {
    newMap[groupKey] =
      originalMap[groupKey]?.map((accountObject) => {
        const account = MarginfiAccountWrapper.fromAccountParsed(
          new PublicKey(accountObject.key),
          client,
          accountObject.account,
        );

        const maintenanceComponentsWithBiasAndWeighted =
          account.computeHealthComponents(MarginRequirementType.Maintenance);

        const healthFactor =
          maintenanceComponentsWithBiasAndWeighted.assets.isZero()
            ? 1
            : maintenanceComponentsWithBiasAndWeighted.assets
                .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
                .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
                .toNumber();

        return {
          account: new PublicKey(accountObject.key),
          healthFactor: healthFactor,
        };
      }) ?? [];
  }

  return newMap;
}

export function getMinimumValue(numbers: number[]): number {
  if (numbers.length === 0) {
    return 100;
  }
  let min = numbers[0] ?? 100;
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] ?? 0 < min) {
      min = numbers[i] ?? 100;
    }
  }
  return min;
}

export async function fetchMarginfiAccounts(
  program: MarginfiProgram,
  config: MarginfiConfig,
  address: string,
): Promise<MarginfiAccountObject[]> {
  return (
    await program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: config.groupPk.toBase58(),
          offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
        },
      },
      {
        memcmp: {
          bytes: address,
          offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
        },
      },
    ])
  ).map((a) => ({
    key: a.publicKey.toBase58(),
    account: a.account as MarginfiAccountRaw,
  }));
}

// const fetchWithRetry = fetchRetry(fetch, {
//   retries: 3,
//   retryDelay: 100,
// }) as any; // minor type mismatch but it's the the same because web3.js specify node-fetch version instead of the standard fetch

export const commitment: Commitment = 'confirmed';

const createConnection = () => {
  return new Connection(process.env.MARGINFI_RPC_ENDPOINT ?? '', {
    commitment,
    // fetch: fetchWithRetry,
    // wsEndpoint: process.env.WS_ENDPOINT,
  });
};

export const connection = createConnection();

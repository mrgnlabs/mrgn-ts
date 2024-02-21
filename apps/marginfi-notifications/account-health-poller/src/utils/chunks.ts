import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { commitment } from "./connection";
import { deserializeAccountInfosMap } from "./accountInfos";

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply<number, T[], T[][]>(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size)
  );
}

interface Result {
  jsonrpc: string;
  result: {
    context: { slot: number };
    value: Array<AccountInfo<string[]> | null>;
  };
}

export async function chunkedGetRawMultipleAccountInfos(
  connection: Connection,
  pks: string[],
  batchChunkSize: number = 1000,
  maxAccountsChunkSize: number = 100
): Promise<[number, Map<string, AccountInfo<Buffer>>]> {
  const accountInfoMap = new Map<string, AccountInfo<string[]>>();
  let contextSlot = 0;
  const debug = require("debug")("mfi:chunkedGetRawMultipleAccountInfos");
  debug(`Starting chunkedGetRawMultipleAccountInfos with ${pks.length} public keys`);

  const batches = chunkArray(pks, batchChunkSize);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    debug(`Processing batch ${i + 1}/${batches.length} of ${batch.length} public keys`);

    const batchRequest = chunkArray(batch, maxAccountsChunkSize).map((pubkeys) => ({
      methodName: "getMultipleAccounts",
      // @ts-expect-error solana web3.js doesnt type zstd but infact it is supported
      // Using zstd instead of base64 because it is faster when fetching
      // base64 was 3x slower than zstd fetching from rpc
      args: connection._buildArgs([pubkeys], commitment, "base64+zstd"),
    }));

    let accountInfos: Array<AccountInfo<string[]> | null> = [];
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries && accountInfos.length === 0) {
      try {
        accountInfos = await connection
          // @ts-ignore
          ._rpcBatchRequest(batchRequest)
          .then((batchResults: Result[]) => {
            contextSlot = Math.max(...batchResults.map((res) => res.result.context.slot));

            const accounts = batchResults.reduce((acc, res) => {
              acc.push(...res.result.value);
              return acc;
            }, [] as Result["result"]["value"]);

            debug(`Received batch result with ${accounts.length} accounts`);
            return accounts;
          });
      } catch (error) {
        debug(`Batch request failed on retry ${retries}: ${error}`);
        retries++;
      }
    }

    if (accountInfos.length === 0) {
      throw new Error(`Failed to fetch account infos after ${maxRetries} retries`);
    }

    accountInfos.forEach((item, index) => {
      const publicKey = batch[index];
      if (item) {
        accountInfoMap.set(publicKey, item);
      }
    });
  }

  return [contextSlot, await deserializeAccountInfosMap(accountInfoMap)];
}

export function convertBase64StringArrayToBuffer(stringArray: string[]): Buffer {
  return Buffer.concat(stringArray.map((s) => Buffer.from(s, "base64")));
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

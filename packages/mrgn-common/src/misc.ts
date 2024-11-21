import { AccountInfo, Connection, Keypair, PublicKey } from "@solana/web3.js";

/**
 * Load Keypair from the provided file.
 */
export function loadKeypair(keypairPath: string): Keypair {
  const path = require("path");
  if (!keypairPath || keypairPath == "") {
    throw new Error("Keypair is required!");
  }
  if (keypairPath[0] === "~") {
    keypairPath = path.join(require("os").homedir(), keypairPath.slice(1));
  }
  const keyPath = path.normalize(keypairPath);
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(require("fs").readFileSync(keyPath).toString())));
}

export function getValueInsensitive<T>(map: Record<string, T>, key: string): T {
  const lowerCaseLabel = key.toLowerCase();
  for (let key in map) {
    if (key.toLowerCase() === lowerCaseLabel) {
      return map[key];
    }
  }
  throw new Error(`Token metadata not found for ${key}`);
}

/**
 * @internal
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size)
  );
}

export function setTimeoutPromise(duration: number, message: string): Promise<Error> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), duration));
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
  const accountInfoMap = new Map<string, AccountInfo<Buffer>>();
  let contextSlot = 0;

  const batches = chunkArray(pks, batchChunkSize);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const batchRequest = chunkArray(batch, maxAccountsChunkSize).map((pubkeys) => ({
      methodName: "getMultipleAccounts",
      args: connection._buildArgs([pubkeys], "confirmed", "base64"),
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

            return accounts;
          });
      } catch (error) {
        retries++;
      }
    }

    if (accountInfos.length === 0) {
      throw new Error(`Failed to fetch account infos after ${maxRetries} retries`);
    }

    accountInfos.forEach((item, index) => {
      const publicKey = batch[index];
      if (item) {
        accountInfoMap.set(publicKey, {
          ...item,
          owner: new PublicKey(item.owner),
          data: Buffer.from(item.data[0], "base64"),
        });
      }
    });
  }

  return [contextSlot, accountInfoMap];
}

export async function chunkedGetRawMultipleAccountInfoOrdered(
  connection: Connection,
  pks: string[],
  batchChunkSize: number = 1000,
  maxAccountsChunkSize: number = 100
): Promise<Array<AccountInfo<Buffer>>> {
  const allAccountInfos: Array<AccountInfo<Buffer>> = [];

  const batches = chunkArray(pks, batchChunkSize);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const batchRequest = chunkArray(batch, maxAccountsChunkSize).map((pubkeys) => ({
      methodName: "getMultipleAccounts",
      args: connection._buildArgs([pubkeys], "confirmed", "base64"),
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
            const accounts = batchResults.reduce((acc, res) => {
              acc.push(...res.result.value);
              return acc;
            }, [] as Result["result"]["value"]);

            return accounts;
          });
      } catch (error) {
        retries++;
      }
    }

    if (accountInfos.length === 0) {
      throw new Error(`Failed to fetch account infos after ${maxRetries} retries`);
    }

    accountInfos.forEach((item) => {
      if (item) {
        allAccountInfos.push({
          ...item,
          owner: new PublicKey(item.owner),
          data: Buffer.from(item.data[0], "base64"),
        });
      }
    });
  }

  return allAccountInfos;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

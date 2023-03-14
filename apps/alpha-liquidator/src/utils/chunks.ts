import { AccountInfo, Connection } from "@solana/web3.js";
import { commitment } from "./connection";

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
): Promise<[number, Map<string, AccountInfo<string[]>>]> {
  const accountInfoMap = new Map<string, AccountInfo<string[]>>();
  let contextSlot = 0;

  const accountInfos: Array<AccountInfo<string[]> | null> = (
    await Promise.all(
      chunks(pks, batchChunkSize).map(async (batchPubkeys) => {
        const batch = chunks(batchPubkeys, maxAccountsChunkSize).map((pubkeys) => ({
          methodName: "getMultipleAccounts",
          // @ts-expect-error solana web3.js doesnt type zstd but infact it is supported
          // Using zstd instead of base64 because it is faster when fetching
          // base64 was 3x slower than zstd fetching from rpc
          args: connection._buildArgs([pubkeys], commitment, "base64+zstd"),
        }));

        return (
          // getMultipleAccounts is quite slow, so we use fetch directly
          connection
            // @ts-ignore
            ._rpcBatchRequest(batch)
            .then((batchResults: Result[]) => {
              contextSlot = Math.max(...batchResults.map((res) => res.result.context.slot));

              const accounts = batchResults.reduce((acc, res) => {
                acc.push(...res.result.value);
                return acc;
              }, [] as Result["result"]["value"]);
              return accounts;
            })
        );
      })
    )
  ).flat();

  accountInfos.forEach((item, index) => {
    const publicKey = pks[index];
    if (item) {
      accountInfoMap.set(publicKey, item);
    }
  });

  return [contextSlot, accountInfoMap];
}

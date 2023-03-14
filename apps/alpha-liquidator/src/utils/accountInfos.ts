import { AccountInfo } from "@solana/web3.js";
import { decompress } from "@mongodb-js/zstd";

async function deserializeAccountInfo(accountInfo: AccountInfo<string[]>): Promise<AccountInfo<Buffer>> {
  // purposely mutate data, so it's faster
  const data = Buffer.from(await decompress(Buffer.from(accountInfo.data[0], "base64")));
  return { ...accountInfo, data };
}

export async function deserializeAccountInfosMap(
  accountInfosMap: Map<string, AccountInfo<string[]>>
): Promise<Map<string, AccountInfo<Buffer>>> {
  const deserializedAccountInfoMap = new Map<string, AccountInfo<Buffer>>();

  let promises: Promise<void>[] = [];

  accountInfosMap.forEach((value, key) => {
    promises.push(
      deserializeAccountInfo(value).then((accountInfo) => (deserializedAccountInfoMap.set(key, accountInfo), void 0))
    );
  });

  await Promise.all(promises);

  return deserializedAccountInfoMap;
}

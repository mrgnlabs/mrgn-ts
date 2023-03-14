import { AccountInfo } from "@solana/web3.js";
import { isMainThread, parentPort } from "worker_threads";
import { deserializeAccountInfosMap } from "./utils/accountInfos";
import { redis } from "./utils/redis";
import { wait } from "./utils/wait";

export const runGetAccountInfosProcess = async () => {
  if (isMainThread) {
    throw new Error("should only run in sub-thread");
  }

  const accountInfosMap = new Map<string, AccountInfo<string[]>>();
  let lastAllAccounts: string = "";
  while (true) {
    const updatedAccountInfosMap = new Map<string, AccountInfo<string[]>>();

    const contextSlot = await redis.get("contextSlot");

    const allAccountsResult = await redis.get("allAccounts");

    if (allAccountsResult) {
      if (lastAllAccounts === allAccountsResult) {
        // skip to next loop if it's the same
        await wait(100);
        continue;
      }
      lastAllAccounts = allAccountsResult;

      const newAccountInfosMap = new Map<string, AccountInfo<string[]>>(JSON.parse(allAccountsResult));
      newAccountInfosMap.forEach((value, key) => {
        if (accountInfosMap.get(key)?.data[0] !== value.data[0]) {
          // set updatedAccountInfosMap to be sent to main process
          updatedAccountInfosMap.set(key, value);
          // update accountInfosMap to be used in next iteration
          accountInfosMap.set(key, value);
        }
      });
    }

    if (updatedAccountInfosMap.size > 0) {
      parentPort?.postMessage({
        type: "accounts",
        contextSlot,
        accountInfosMap: await deserializeAccountInfosMap(updatedAccountInfosMap),
      });
    } else {
      parentPort?.postMessage({
        type: "contextSlot",
        contextSlot,
      });
    }

    await wait(400);
  }
};

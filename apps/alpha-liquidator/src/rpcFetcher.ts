import { Jupiter } from "@jup-ag/core";
import { connection } from "./utils/connection";
import { chunkedGetRawMultipleAccountInfos } from "./utils/chunks";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { redis } from "./utils/redis";
import { deserializeAccountInfosMap } from "./utils/accountInfos";
import { wait } from "./utils/wait";
import { ammsToExclude } from "./ammsToExclude";

/**
 * Fetch the accounts from the RPC server and publish them through redis.
 */
async function main() {
  let lastUpdatedData = {
    value: process.uptime(),
  };

  async function loadJupiter() {
    const jupiter = await Jupiter.load({
      connection,
      cluster: "mainnet-beta",
      ammsToExclude,
    });
    const accountToAmmIdsMap = jupiter.getAccountToAmmIdsMap();
    const ammIdToAmmMap = jupiter.getAmmIdToAmmMap();
    const addressesToFetchSet = new Set(accountToAmmIdsMap.keys());

    const addressesToFetch = {
      set: addressesToFetchSet,
      // we have this to prevent doing Array.from in the loop and waste computation
      array: Array.from(addressesToFetchSet),
    };

    const [contextSlot, accountInfosMap] = await chunkedGetRawMultipleAccountInfos(connection, addressesToFetch.array);

    const deserializedAccountInfosMap = await deserializeAccountInfosMap(accountInfosMap);

    await redis.set("allAccounts", JSON.stringify(Array.from(accountInfosMap.entries())));
    await redis.set("contextSlot", contextSlot);

    deserializedAccountInfosMap.forEach((value) => {
      value.data = Buffer.from(value.data);
      value.owner = new PublicKey(value.owner);
    });

    process.send?.("ready");

    return {
      jupiter,
      ammIdToAmmMap,
      accountToAmmIdsMap,
      addressesToFetch,
      accountInfosMap,
      deserializedAccountInfosMap,
    };
  }

  let store = await loadJupiter();

  setInterval(() => {
    if (process.uptime() - lastUpdatedData.value > 30) {
      console.error(new Error("Data is not being updated"));
      // kill itself and pm2 will restart
      process.exit(1);
    }
  }, 30000);

  while (true) {
    try {
      const { addressesToFetch, ammIdToAmmMap, accountInfosMap, accountToAmmIdsMap, deserializedAccountInfosMap } =
        store;
      const updatedAccountInfosMap = new Map<string, AccountInfo<string[]>>();
      const [contextSlot, newAccountInfosMap] = await chunkedGetRawMultipleAccountInfos(
        connection,
        addressesToFetch.array
      );

      newAccountInfosMap.forEach((value, key) => {
        if (accountInfosMap.get(key)?.data[0] !== value.data[0]) {
          // set updatedAccountInfosMap to be sent to main process
          updatedAccountInfosMap.set(key, value);
          // update accountInfosMap to be used in next iteration
          accountInfosMap.set(key, value);
        }
      });

      lastUpdatedData.value = process.uptime();

      if (updatedAccountInfosMap.size > 0) {
        let ammIdsToUpdate = new Set<string>();

        redis.set("allAccounts", JSON.stringify(Array.from(accountInfosMap.entries())));
        redis.set("contextSlot", contextSlot);

        (await deserializeAccountInfosMap(updatedAccountInfosMap)).forEach((value, key) => {
          let ammIds = accountToAmmIdsMap.get(key);
          value.owner = new PublicKey(value.owner);

          if (ammIds) {
            ammIds.forEach((ammId) => {
              ammIdsToUpdate.add(ammId);
            });
          }
          deserializedAccountInfosMap.set(key, value);
        });

        ammIdsToUpdate.forEach((ammId) => {
          const amm = ammIdToAmmMap.get(ammId);
          if (amm) {
            try {
              amm.update(deserializedAccountInfosMap);
            } catch (e) {
              console.error(e);
            }
            if (amm.hasDynamicAccounts) {
              amm.getAccountsForUpdate().forEach((pk) => {
                const account = pk.toString();
                const ammsFromMap = accountToAmmIdsMap.get(account) || new Set();
                ammsFromMap.add(amm.id);
                accountToAmmIdsMap.set(account, ammsFromMap);
                if (!addressesToFetch.set.has(account)) {
                  addressesToFetch.set.add(account);
                  addressesToFetch.array.push(account);
                }
              });
            }
          }
        });
      }
      await wait(2_000);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

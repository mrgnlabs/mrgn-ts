import { MarginfiAccountRaw, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { env_config } from "../config";
import { PublicKey } from "@solana/web3.js";

export interface MarginfiAccountMap {
  [key: string]: { key: string; account: MarginfiAccountRaw }[];
}

export interface MarginfiWrapperAccountMap {
  [key: string]: { key: string; account: MarginfiAccountWrapper }[];
}

export async function getMarginfiAccounts(wallets: string[]): Promise<MarginfiAccountMap | null> {
  const response = await fetch(`${env_config.MARGINFI_API_URL}/notifications`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      //   "X-API-KEY": env_config.MARGINFI_API_KEY,
    },
    body: JSON.stringify({
      walletKeys: wallets,
    }),
  });

  if (!response.ok) {
    console.error(`Failed to fetch user settings for wallets: ${response.statusText}`);
    return null;
  }

  const data = await response.json();
  return data;
}

export async function transformAccountMap(
  originalMap: MarginfiAccountMap,
  client: MarginfiClient
): Promise<MarginfiWrapperAccountMap> {
  const newMap: MarginfiWrapperAccountMap = {};

  for (const groupKey in originalMap) {
    newMap[groupKey] = originalMap[groupKey].map((accountObject) => ({
      key: accountObject.key,
      account: MarginfiAccountWrapper.fromAccountParsed(
        new PublicKey(accountObject.key),
        client,
        accountObject.account
      ),
    }));
  }

  return newMap;
}

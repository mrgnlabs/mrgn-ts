import { env_config } from "../config";

type UserData = {
  email: string;
  wallet_address: string;
  account_health: boolean;
  ybx_updates: boolean;
  updated_at: Date;
  last_notification?: Date;
};

export async function getUserSettings(wallet: string): Promise<UserData | null> {
  console.log(`${env_config.MARGINFI_API_URL}/notifications?wallet_address=${wallet}`);
  const response = await fetch(`${env_config.MARGINFI_API_URL}/notifications?wallet_address=${wallet}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env_config.MARGINFI_API_KEY,
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch user settings for wallet ${wallet}: ${response.statusText}`);
    return null;
  }

  const data = await response.json();
  return data;
}

export async function updateLastNotification(wallet: string, timestamp: string) {
  const response = await fetch(`${env_config.MARGINFI_API_URL}/notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env_config.MARGINFI_API_KEY,
    },
    body: JSON.stringify({
      wallet_address: wallet,
      last_notification: timestamp,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to update last notification for wallet ${wallet}: ${errorText}`);
    throw new Error(`API request failed: ${response.statusText}`);
  }
}

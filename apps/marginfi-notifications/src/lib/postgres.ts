import { Pool } from "pg";
import { env_config } from "../config";

type UserData = {
  email: string;
  wallet_address: string;
  account_health: boolean;
  ybx_updates: boolean;
  updated_at: Date;
  last_notification?: Date;
};

const pool = new Pool({
  user: env_config.PG_USER,
  host: env_config.PG_HOST,
  database: env_config.PG_DATABASE,
  password: env_config.PG_PASSWORD,
  port: env_config.PG_PORT,
});

export async function getUserSettings(wallet: string): Promise<UserData | null> {
  const query = "SELECT * FROM notification_settings WHERE wallet_address = $1";
  const { rows } = await pool.query(query, [wallet]);

  if (rows.length === 0) {
    return null;
  }

  const userData = rows[0];

  // Convert timestamp fields from string to Date objects
  userData.updated_at = new Date(userData.updated_at);
  if (userData.last_notification) {
    userData.last_notification = new Date(userData.last_notification);
  } else {
    // If there is no last_notification, ensure it's properly set to undefined
    userData.last_notification = undefined;
  }

  return userData as UserData; // Cast the modified object back to UserData type
}

export async function updateLastNotification(wallet: string, timestamp: Date) {
  const query = "UPDATE notification_settings SET last_notification = $1 WHERE wallet_address = $2";
  await pool.query(query, [timestamp, wallet]);
}

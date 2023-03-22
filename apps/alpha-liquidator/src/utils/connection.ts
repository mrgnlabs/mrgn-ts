import { Commitment, Connection } from "@solana/web3.js";
import fetchRetry from "fetch-retry";
import fetch from "cross-fetch";
import { parseEnvConfig } from "../config";

const env_config = parseEnvConfig();

export const commitment: Commitment = "confirmed";

const fetchWithRetry = fetchRetry(fetch, {
  retries: 3,
  retryDelay: 100,
}) as any; // minor type mismatch but it's the the same because web3.js specify node-fetch version instead of the standard fetch

const createConnection = () =>
  new Connection(env_config.RPC_ENDPOINT, {
    commitment,
    fetch: fetchWithRetry,
  });

export let connection = createConnection();

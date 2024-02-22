import { Commitment, Connection } from "@solana/web3.js";
import fetchRetry from "fetch-retry";
import fetch from "cross-fetch";
import { env_config } from "../config";

export const commitment: Commitment = "confirmed";

const fetchWithRetry = fetchRetry(fetch, {
  retries: 3,
  retryDelay: 100,
}) as any; // minor type mismatch but it's the the same because web3.js specify node-fetch version instead of the standard fetch

const createConnection = () =>
  new Connection(env_config.RPC_ENDPOINT, {
    commitment,
    fetch: fetchWithRetry,
    wsEndpoint: env_config.WS_ENDPOINT,
  });

export let connection = createConnection();

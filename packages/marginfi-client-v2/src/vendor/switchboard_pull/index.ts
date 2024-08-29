import { BN, BorshCoder, Idl, Program, Provider } from "@coral-xyz/anchor";
import SWB_ONDEMAND_IDL from "./idl.json";
import { PublicKey } from "@solana/web3.js";

export const SWITCHBOARD_ONDEMANDE_PRICE_PRECISION = 18;

export interface CurrentResult {
  value: BN;
  std_dev: BN;
  mean: BN;
  range: BN;
  min_value: BN;
  max_vaalue: BN;
  slot: BN;
  min_slot: BN;
  max_slot: BN;
}

export interface OracleSubmission {
  oracle: PublicKey;
  slot: BN;
  value: BN;
}

export interface PullFeedAccountData {
  submissions: OracleSubmission[];
  authority: PublicKey;
  queue: PublicKey;
  feed_hash: Buffer;
  initialized_at: BN;
  permissions: BN;
  max_variance: BN;
  min_responses: number;
  name: Buffer;
  sample_size: number;
  last_update_timestamp: BN;
  lut_slot: BN;
  result: CurrentResult;
  max_staleness: number;
  min_sample_size: number;
}

export type CrossbarSimulatePayload = FeedResponse[];

export interface FeedResponse {
  feedHash: string;
  results: number[];
}

export const switchboardAccountCoder = new BorshCoder(SWB_ONDEMAND_IDL as unknown as Idl);
export function getSwitchboardProgram(provider: Provider): Program {
  return new Program(SWB_ONDEMAND_IDL as unknown as Idl, provider);
}

export function decodeSwitchboardPullFeedData(data: Buffer): PullFeedAccountData {
  const pullFeedDAta = switchboardAccountCoder.accounts.decode("PullFeedAccountData", data) as PullFeedAccountData;
  return pullFeedDAta;
}

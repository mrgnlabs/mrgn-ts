import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Program as ProgramType } from "@mrgnlabs/mrgn-common";
import { StakePoolProxy, IDL } from "./stake-pool-proxy-types";
import { PublicKey } from "@solana/web3.js";

export type StakePoolProxyProgram = ProgramType<StakePoolProxy>;

export const STAKE_POOL_PROXY_PROGRAM_ID = new PublicKey("SPPdCjFYYwH3ca2kCT9baLcgbXz81P5bd5QutHynuRz");

export function getStakePoolProxyProgram(provider: AnchorProvider) {
  return  new Program(IDL, STAKE_POOL_PROXY_PROGRAM_ID, provider) as any as StakePoolProxyProgram;
}

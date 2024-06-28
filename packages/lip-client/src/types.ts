import { PublicKey } from "@solana/web3.js";
import { LipIdlType } from "./idl";
import { Program, ProgramReadonly } from "@mrgnlabs/mrgn-common";
import { Environment } from "@mrgnlabs/marginfi-client-v2";

export type LipProgram = Program<LipIdlType>;
export type LipProgramReadonly = ProgramReadonly<LipIdlType>;

export interface LipConfig {
  environment: Environment;
  cluster: string;
  programId: PublicKey;
}

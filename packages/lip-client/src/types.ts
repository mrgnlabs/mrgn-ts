import { PublicKey } from "@solana/web3.js";
import { Lip } from "./idl";
import { Program, ProgramReadonly } from "@mrgnlabs/mrgn-common";
import { Environment } from "@mrgnlabs/marginfi-client-v2";

export type LipProgram = Program<Lip>;
export type LipProgramReadonly = ProgramReadonly<Lip>;

export interface LipConfig {
  environment: Environment;
  cluster: string;
  programId: PublicKey;
}

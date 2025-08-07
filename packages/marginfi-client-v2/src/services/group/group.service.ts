import { PublicKey, StakeProgram, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import { InstructionsWrapper, SINGLE_POOL_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

import {
  findPoolAddress,
  findPoolStakeAddress,
  findPoolMintAddress,
  findPoolOnRampAddress,
} from "../../vendor/single-spl-pool";

import { BankConfigOptRaw, BankConfigOpt, serializeBankConfigOpt, BankConfigCompactRaw } from "../bank";
import { MarginfiProgram } from "../../types";
import instructions from "../../instructions";

export async function makePoolConfigureBankIx(
  program: MarginfiProgram,
  bank: PublicKey,
  args: BankConfigOptRaw
): Promise<InstructionsWrapper> {
  const ix = await instructions.makePoolConfigureBankIx(
    program,
    {
      bank: bank,
    },
    { bankConfigOpt: args }
  );

  return {
    instructions: [ix],
    keys: [],
  };
}

export async function makeAddPermissionlessStakedBankIx(
  program: MarginfiProgram,
  group: PublicKey,
  voteAccountAddress: PublicKey,
  feePayer: PublicKey,
  pythOracle: PublicKey // wSOL oracle
): Promise<InstructionsWrapper> {
  const [settingsKey] = PublicKey.findProgramAddressSync(
    [Buffer.from("staked_settings", "utf-8"), group.toBuffer()],
    program.programId
  );
  const poolAddress = findPoolAddress(voteAccountAddress);
  const solPool = findPoolStakeAddress(poolAddress);
  const lstMint = findPoolMintAddress(poolAddress);
  const onRampAddress = findPoolOnRampAddress(poolAddress);

  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: false },
    { pubkey: onRampAddress, isSigner: false, isWritable: true },
    { pubkey: solPool, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
  ];

  // TODO don't hard code the instruction index? (or why not, it's not gna change is it?)
  const data = Buffer.from(Uint8Array.of(6));

  const onrampIx = new TransactionInstruction({
    keys,
    programId: SINGLE_POOL_PROGRAM_ID,
    data,
  });

  const remainingKeys = [pythOracle, lstMint, solPool];

  const ix = await instructions.makePoolAddPermissionlessStakedBankIx(
    program,
    {
      stakedSettings: settingsKey,
      feePayer: feePayer,
      bankMint: lstMint,
      solPool,
      stakePool: poolAddress,
    },
    remainingKeys.map((key) => ({ pubkey: key, isSigner: false, isWritable: false })),
    {
      seed: new BN(0),
    }
  );

  return {
    instructions: [ix],
    keys: [],
  };
}

export async function makePoolAddBankIx(
  program: MarginfiProgram,
  group: PublicKey,
  bank: PublicKey,
  feePayer: PublicKey,
  bankMint: PublicKey,
  bankConfig: BankConfigOpt,
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
  overrideOpt: { admin?: PublicKey; globalFeeWallet?: PublicKey } = {}
): Promise<InstructionsWrapper> {
  let rawBankConfig = serializeBankConfigOpt(bankConfig);

  // TODO verify this is correct
  const rawBankConfigCompact = {
    ...rawBankConfig,
    oracleMaxAge: bankConfig.oracleMaxAge,
    auto_padding_0: [0],
    auto_padding_1: [0],
  } as unknown as BankConfigCompactRaw;

  const ix = await instructions.makePoolAddBankIx(
    program,
    {
      marginfiGroup: group,
      feePayer,
      bankMint,
      bank,
      tokenProgram,
      ...overrideOpt,
      // if two oracle keys: first is feed id, second is oracle key
    },
    {
      bankConfig: rawBankConfigCompact,
    }
  );

  return {
    instructions: [ix], //ix
    keys: [],
  };
}

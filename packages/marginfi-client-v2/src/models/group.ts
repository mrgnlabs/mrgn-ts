import { BorshCoder } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, StakeProgram, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import { InstructionsWrapper, SINGLE_POOL_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

import { MarginfiIdlType } from "../idl";
import { AccountType, MarginfiProgram } from "../types";
import instructions from "../instructions";
import { FLASHLOAN_ENABLED_FLAG, TRANSFER_ACCOUNT_AUTHORITY_FLAG } from "../constants";
import {
  BankConfigCompactRaw,
  BankConfigOpt,
  BankConfigOptRaw,
  makeAddPermissionlessStakedBankIx,
  makeDisableAccountTransferForAccountIx,
  makeDisableFlashLoanForAccountIx,
  makeEnableAccountTransferForAccountIx,
  makeEnableFlashLoanForAccountIx,
  makePoolAddBankIx,
  makePoolConfigureBankIx,
  MarginfiGroupRaw,
  serializeBankConfigOpt,
} from "../services";
import { findPoolAddress, findPoolMintAddress, findPoolOnRampAddress, findPoolStakeAddress } from "../vendor";

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class MarginfiGroup {
  public address: PublicKey;
  public admin: PublicKey;

  constructor(admin: PublicKey, address: PublicKey) {
    this.admin = admin;
    this.address = address;
  }

  // ----------------------------------------------------------------------------
  // Factories
  // ----------------------------------------------------------------------------

  static fromAccountParsed(address: PublicKey, accountData: MarginfiGroupRaw): MarginfiGroup {
    const marginfiGroup = {
      admin: accountData.admin,
    };
    return new MarginfiGroup(marginfiGroup.admin, address);
  }

  static fromBuffer(address: PublicKey, rawData: Buffer, idl: MarginfiIdlType) {
    const data = MarginfiGroup.decode(rawData, idl);
    return MarginfiGroup.fromAccountParsed(address, data);
  }

  static decode(encoded: Buffer, idl: MarginfiIdlType): MarginfiGroupRaw {
    const coder = new BorshCoder(idl);
    return coder.accounts.decode(AccountType.MarginfiGroup, encoded);
  }

  static async encode(decoded: MarginfiGroupRaw, idl: MarginfiIdlType): Promise<Buffer> {
    const coder = new BorshCoder(idl);
    return await coder.accounts.encode(AccountType.MarginfiGroup, decoded);
  }

  // ----------------------------------------------------------------------------
  // Admin actions
  // ----------------------------------------------------------------------------

  // ------------------------------------------------------------------------
  // (TODO: move to MarginfiAccountWrapper class)
  // ------------------------------------------------------------------------
  public async makeEnableFlashLoanForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    return makeEnableFlashLoanForAccountIx(program, marginfiAccountAddress);
  }

  public async makeDisableFlashLoanForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    return makeDisableFlashLoanForAccountIx(program, marginfiAccountAddress);
  }

  public async makeEnableAccountTransferForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    return makeEnableAccountTransferForAccountIx(program, marginfiAccountAddress);
  }

  public async makeDisableAccountTransferForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    return makeDisableAccountTransferForAccountIx(program, marginfiAccountAddress);
  }

  // ------------------------------------------------------------------------
  // (TODO: move to Bank class)
  // ------------------------------------------------------------------------
  public async makePoolConfigureBankIx(
    program: MarginfiProgram,
    bank: PublicKey,
    args: BankConfigOptRaw
  ): Promise<InstructionsWrapper> {
    return makePoolConfigureBankIx(program, bank, args);
  }

  public async makeAddPermissionlessStakedBankIx(
    program: MarginfiProgram,
    voteAccountAddress: PublicKey,
    feePayer: PublicKey,
    pythOracle: PublicKey // wSOL oracle
  ): Promise<InstructionsWrapper> {
    return makeAddPermissionlessStakedBankIx(program, this.address, voteAccountAddress, feePayer, pythOracle);
  }

  public async makePoolAddBankIx(
    program: MarginfiProgram,
    bankPubkey: PublicKey,
    bankMint: PublicKey,
    bankConfig: BankConfigOpt,
    feePayer?: PublicKey
  ): Promise<InstructionsWrapper> {
    return makePoolAddBankIx(program, this.address, bankPubkey, feePayer ?? this.admin, bankMint, bankConfig);
  }
}

export { MarginfiGroup };

import { BorshCoder } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import BN from "bn.js";
import { MARGINFI_IDL, MarginfiIdlType } from "../idl";
import { AccountType, BankVaultType, MarginfiProgram } from "../types";
import { InstructionsWrapper, SINGLE_POOL_PROGRAM_ID, TOKEN_PROGRAM_ID, getMint } from "@mrgnlabs/mrgn-common";
import instructions from "../instructions";
import { FLASHLOAN_ENABLED_FLAG, TRANSFER_ACCOUNT_AUTHORITY_FLAG } from "../constants";
import { BankConfigCompactRaw, BankConfigOpt, BankConfigOptRaw, serializeBankConfigOpt } from "./bank";
import { BigNumber } from "bignumber.js";
import { sha256 } from "crypto-hash";
import { findPoolAddress, findPoolMintAddress, findPoolStakeAddress } from "../vendor";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface MarginfiGroupRaw {
  admin: PublicKey;
  padding0: BN[];
  padding1: BN[];
}

export type { MarginfiGroupRaw };

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

  public async makeEnableFlashLoanForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const ix = await instructions.makeSetAccountFlagIx(
      program,
      {
        marginfiGroup: this.address,
        marginfiAccount: marginfiAccountAddress,
        admin: this.admin,
      },
      { flag: new BN(FLASHLOAN_ENABLED_FLAG) }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }

  public async makeDisableFlashLoanForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const ix = await instructions.makeUnsetAccountFlagIx(
      program,
      {
        marginfiGroup: this.address,
        marginfiAccount: marginfiAccountAddress,
        admin: this.admin,
      },
      { flag: new BN(FLASHLOAN_ENABLED_FLAG) }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }

  public async makeEnableAccountTransferForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const ix = await instructions.makeSetAccountFlagIx(
      program,
      {
        marginfiGroup: this.address,
        marginfiAccount: marginfiAccountAddress,
        admin: this.admin,
      },
      { flag: new BN(TRANSFER_ACCOUNT_AUTHORITY_FLAG) }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }

  public async makeDisableAccountTransferForAccountIx(
    program: MarginfiProgram,
    marginfiAccountAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const ix = await instructions.makeUnsetAccountFlagIx(
      program,
      {
        marginfiGroup: this.address,
        marginfiAccount: marginfiAccountAddress,
        admin: this.admin,
      },
      { flag: new BN(TRANSFER_ACCOUNT_AUTHORITY_FLAG) }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }

  public async makePoolConfigureBankIxb(
    program: MarginfiProgram,
    bank: PublicKey,
    args: BankConfigOptRaw
  ): Promise<InstructionsWrapper> {
    const ix = await instructions.makePoolConfigureBankIx(
      program,
      {
        marginfiGroup: this.address,
        admin: this.admin,
        bank: bank,
      },
      { bankConfigOpt: args }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }

  public async makeAddPermissionlessStakedBankIx(
    program: MarginfiProgram,
    voteAccountAddress: PublicKey,
    feePayer: PublicKey,
    pythOracle: PublicKey // wSOL oracle
  ): Promise<InstructionsWrapper> {
    const [settingsKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("staked_settings", "utf-8"), this.address.toBuffer()],
      program.programId
    );
    const poolAddress = findPoolAddress(voteAccountAddress);
    const solPool = findPoolStakeAddress(poolAddress);
    const lstMint = findPoolMintAddress(poolAddress);

    const ix = await instructions.makePoolAddPermissionlessStakedBankIx(
      program,
      {
        stakedSettings: settingsKey,
        feePayer: feePayer,
        bankMint: lstMint,
        solPool,
        stakePool: poolAddress,
      },
      {
        pythOracle: pythOracle,
      },
      {
        seed: new BN(0),
      }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }

  public async makePoolAddBankIx(
    program: MarginfiProgram,
    bankPubkey: PublicKey,
    bankMint: PublicKey,
    bankConfig: BankConfigOpt,
    overrideOpt: { admin?: PublicKey; groupAddress?: PublicKey }
  ): Promise<InstructionsWrapper> {
    let rawBankConfig = serializeBankConfigOpt(bankConfig);

    const rawBankConfigCompact = {
      ...rawBankConfig,
      oracleMaxAge: bankConfig.oracleMaxAge,
      auto_padding_0: [0],
      auto_padding_1: [0],
    } as BankConfigCompactRaw;

    const ix = await instructions.makePoolAddBankIx(
      program,
      {
        marginfiGroup: overrideOpt.groupAddress ?? this.address,
        admin: overrideOpt.admin ?? this.admin,
        feePayer: overrideOpt.admin ?? this.admin,
        bankMint: bankMint,
        bank: bankPubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
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
}

export { MarginfiGroup };

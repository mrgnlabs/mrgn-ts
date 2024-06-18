import { BorshCoder } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import BN from "bn.js";
import { MARGINFI_IDL } from "../idl";
import { AccountType, BankVaultType, MarginfiProgram } from "../types";
import { InstructionsWrapper, TOKEN_PROGRAM_ID, getMint } from "@mrgnlabs/mrgn-common";
import instructions from "../instructions";
import { FLASHLOAN_ENABLED_FLAG, TRANSFER_ACCOUNT_AUTHORITY_FLAG } from "../constants";
import { BankConfigCompactRaw, BankConfigOpt, BankConfigOptRaw, serializeBankConfigOpt } from "./bank";
import { BigNumber } from "bignumber.js";
import { sha256 } from "crypto-hash";

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

  public async makePoolAddBankIx(
    program: MarginfiProgram,
    connection: Connection,
    bankPubkey: PublicKey,
    bankMint: PublicKey,
    bankConfig: BankConfigOpt
  ): Promise<InstructionsWrapper> {
    const liquidityVaultSeed = [Buffer.from("liquidity_vault"), bankPubkey.toBuffer()];
    const liquidityVaultAuthoritySeed = [Buffer.from("liquidity_vault_auth"), bankPubkey.toBuffer()];

    const insuranceVaultSeed = [Buffer.from("insurance_vault"), bankPubkey.toBuffer()];
    const insuranceVaultAuthoritySeed = [Buffer.from("insurance_vault_auth"), bankPubkey.toBuffer()];

    const feeVaultSeed = [Buffer.from("fee_vault"), bankPubkey.toBuffer()];
    const feeVaultAuthoritySeed = [Buffer.from("fee_vault_auth"), bankPubkey.toBuffer()];

    const [liquidityVault] = PublicKey.findProgramAddressSync(liquidityVaultSeed, program.programId);
    const [liquidityVaultAuthority] = PublicKey.findProgramAddressSync(liquidityVaultAuthoritySeed, program.programId);

    const [insuranceVault] = PublicKey.findProgramAddressSync(insuranceVaultSeed, program.programId);
    const [insuranceVaultAuthority] = PublicKey.findProgramAddressSync(insuranceVaultAuthoritySeed, program.programId);

    const [feeVault] = PublicKey.findProgramAddressSync(feeVaultSeed, program.programId);
    const [feeVaultAuthority] = PublicKey.findProgramAddressSync(feeVaultAuthoritySeed, program.programId);

    // TODO: convert depositLimit and borrowLimit based on mint decimals
    // const mint = getMint(connection, bankMint);

    let rawBankConfig = serializeBankConfigOpt(bankConfig);

    const rawBankConfigCompact = {
      ...rawBankConfig,
      oracleKey: rawBankConfig.oracle?.keys[0],
      oracleSetup: rawBankConfig.oracle?.setup,
      auto_padding_0: [0],
      auto_padding_1: [0],
    } as BankConfigCompactRaw;

    const ix = await instructions.makePoolAddBankIx(
      program,
      {
        marginfiGroup: this.address,
        admin: this.admin,
        feePayer: this.admin,
        bankMint: bankMint,
        bank: bankPubkey,
        liquidityVaultAuthority: liquidityVaultAuthority,
        liquidityVault: liquidityVault,
        insuranceVaultAuthority: insuranceVaultAuthority,
        insuranceVault: insuranceVault,
        feeVaultAuthority: feeVaultAuthority,
        feeVault: feeVault,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        oracleKey: rawBankConfigCompact.oracleKey,
      },
      {
        bankConfig: rawBankConfigCompact,
      }
    );

    return {
      instructions: [ix],
      keys: [],
    };
  }
}

export { MarginfiGroup };

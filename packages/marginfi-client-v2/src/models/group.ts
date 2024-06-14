import { BorshCoder } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import BN from "bn.js";
import { MARGINFI_IDL } from "../idl";
import { AccountType, BankVaultType, MarginfiProgram } from "../types";
import { InstructionsWrapper, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
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

  static fromBuffer(address: PublicKey, rawData: Buffer) {
    const data = MarginfiGroup.decode(rawData);
    return MarginfiGroup.fromAccountParsed(address, data);
  }

  static decode(encoded: Buffer): MarginfiGroupRaw {
    const coder = new BorshCoder(MARGINFI_IDL);
    return coder.accounts.decode(AccountType.MarginfiGroup, encoded);
  }

  static async encode(decoded: MarginfiGroupRaw): Promise<Buffer> {
    const coder = new BorshCoder(MARGINFI_IDL);
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

  getVaultSeed(vaultType: string, bankPk: PublicKey): Uint8Array {
    return Buffer.concat([Buffer.from(vaultType), bankPk.toBuffer()]);
  }

  getVaultAuthoritySeed(vaultType: string, bankPk: PublicKey): Uint8Array {
    return Buffer.concat([Buffer.from(`${vaultType}_auth`), bankPk.toBuffer()]);
  }

  async hashSeed(seed: Uint8Array): Promise<Uint8Array> {
    const hash = await sha256(seed);
    return new Uint8Array(Buffer.from(hash, "hex"));
  }

  public async makePoolAddBankIx(
    program: MarginfiProgram,
    connection: Connection,
    bankMint: PublicKey,
    bankConfig: BankConfigOpt
  ): Promise<InstructionsWrapper> {
    let bankPda: PublicKey = PublicKey.default;
    let bankSeed: number = 0;

    for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) {
      console.log("Seed option enabled -- generating a PDA account");

      const iBytes = new Uint8Array(new BigUint64Array([BigInt(i)]).buffer);
      const seeds = [this.address.toBuffer(), bankMint.toBuffer(), iBytes];

      const [pda] = await PublicKey.findProgramAddressSync(seeds, program.programId);

      const accountInfo = await connection.getAccountInfo(pda, "confirmed");

      if (!accountInfo) {
        // Bank address is free
        console.log("Successfully generated a PDA account");
        bankPda = pda;
        bankSeed = i;
        break;
      }
    }

    const liquidityVaultSeed = await this.hashSeed(Buffer.concat([Buffer.from("liquidity_vault"), bankPda.toBuffer()]));
    const liquidityVaultAuthoritySeed = await this.hashSeed(
      Buffer.concat([Buffer.from("liquidity_vault_auth"), bankPda.toBuffer()])
    );

    const insuranceVaultSeed = await this.hashSeed(Buffer.concat([Buffer.from("insurance_vault"), bankPda.toBuffer()]));
    const insuranceVaultAuthoritySeed = await this.hashSeed(
      Buffer.concat([Buffer.from("insurance_vault_auth"), bankPda.toBuffer()])
    );

    const feeVaultSeed = await this.hashSeed(Buffer.concat([Buffer.from("fee_vault"), bankPda.toBuffer()]));
    const feeVaultAuthoritySeed = await this.hashSeed(
      Buffer.concat([Buffer.from("fee_vault_auth"), bankPda.toBuffer()])
    );

    const [liquidityVault] = PublicKey.findProgramAddressSync([liquidityVaultSeed], program.programId);
    const [liquidityVaultAuthority] = PublicKey.findProgramAddressSync(
      [liquidityVaultAuthoritySeed],
      program.programId
    );

    const [insuranceVault] = PublicKey.findProgramAddressSync([insuranceVaultSeed], program.programId);
    const [insuranceVaultAuthority] = PublicKey.findProgramAddressSync(
      [insuranceVaultAuthoritySeed],
      program.programId
    );

    const [feeVault] = PublicKey.findProgramAddressSync([feeVaultSeed], program.programId);
    const [feeVaultAuthority] = PublicKey.findProgramAddressSync([feeVaultAuthoritySeed], program.programId);

    let rawBankConfig = serializeBankConfigOpt(bankConfig);

    const rawBankConfigCompact = {
      ...rawBankConfig,
      oracleKey: rawBankConfig.oracle?.keys[0],
      oracleSetup: rawBankConfig.oracle?.setup,
      auto_padding_0: [0],
      auto_padding_1: [0],
    } as BankConfigCompactRaw;

    delete rawBankConfigCompact.oracle;

    const ix = await instructions.makePoolAddBankIx(
      program,
      {
        marginfiGroup: this.address,
        admin: this.admin,
        feePayer: this.admin,
        bankMint: bankMint,
        bank: bankPda,
        liquidityVaultAuthority: liquidityVaultAuthority,
        liquidityVault: liquidityVault,
        insuranceVaultAuthority: insuranceVaultAuthority,
        insuranceVault: insuranceVault,
        feeVaultAuthority: feeVaultAuthority,
        feeVault: feeVault,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      },
      {
        bankConfig: rawBankConfigCompact,
        seed: new BN(bankSeed),
      }
    );

    console.log("Generated add bank ix", ix);

    return {
      instructions: [ix],
      keys: [],
    };
  }
}

export { MarginfiGroup };

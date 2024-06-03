import { BorshCoder } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { MARGINFI_IDL } from "../idl";
import { AccountType, MarginfiProgram } from "../types";
import { InstructionsWrapper } from "@mrgnlabs/mrgn-common";
import instructions from "../instructions";
import { FLASHLOAN_ENABLED_FLAG, TRANSFER_ACCOUNT_AUTHORITY_FLAG } from "../constants";
import { BankConfigOptRaw } from "./bank";

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
}

export { MarginfiGroup };

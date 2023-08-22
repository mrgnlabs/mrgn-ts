import { BorshCoder } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { MARGINFI_IDL } from "../idl";
import { AccountType } from "../types";

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
  public admin: PublicKey;

  constructor(admin: PublicKey) {
    this.admin = admin;
  }

  static fromAccountParsed(accountData: MarginfiGroupRaw): MarginfiGroup {
    const marginfiGroup = parseMarginfiGroup(accountData);
    return new MarginfiGroup(marginfiGroup.admin);
  }

  static fromBuffer(rawData: Buffer) {
    const data = MarginfiGroup.decode(rawData);
    return MarginfiGroup.fromAccountParsed(data);
  }

  static decode(encoded: Buffer): MarginfiGroupRaw {
    const coder = new BorshCoder(MARGINFI_IDL);
    return coder.accounts.decode(AccountType.MarginfiGroup, encoded);
  }

  static async encode(decoded: MarginfiGroupRaw): Promise<Buffer> {
    const coder = new BorshCoder(MARGINFI_IDL);
    return await coder.accounts.encode(AccountType.MarginfiGroup, decoded);
  }
}

export { MarginfiGroup };

// ----------------------------------------------------------------------------
// Factories
// ----------------------------------------------------------------------------

function parseMarginfiGroup(marginfiGroupRaw: MarginfiGroupRaw): MarginfiGroup {
  return {
    admin: marginfiGroupRaw.admin,
  };
}

export { parseMarginfiGroup };

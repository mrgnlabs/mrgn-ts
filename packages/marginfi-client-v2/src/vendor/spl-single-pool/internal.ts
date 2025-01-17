import { TransactionInstruction } from "@solana/web3.js";

import { PublicKey } from "@solana/web3.js";

export function modernInstructionToLegacy(modernInstruction: any): TransactionInstruction {
  const keys = [];
  for (const account of modernInstruction.accounts) {
    keys.push({
      pubkey: new PublicKey(account.address),
      isSigner: !!(account.role & 2),
      isWritable: !!(account.role & 1),
    });
  }

  return new TransactionInstruction({
    programId: new PublicKey(modernInstruction.programAddress),
    keys,
    data: Buffer.from(modernInstruction.data),
  });
}

import {
  BroadcastMethodType,
  DEFAULT_PROCESS_TX_STRATEGY,
  MARGINFI_IDL,
  MarginfiIdlType,
  ProcessTransactionStrategy,
} from "@mrgnlabs/marginfi-client-v2";
import {
  decodeInstruction,
  decompileV0Transaction,
  isV0Tx,
  SolanaTransaction,
  TransactionType,
} from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

export function getTransactionStrategy(): ProcessTransactionStrategy | undefined {
  const hasStrategyDefined =
    !!process.env.NEXT_PUBLIC_TX_FALLBACK_SEQUENCE ||
    !!process.env.NEXT_PUBLIC_TX_SINGLE_BROADCAST_TYPE ||
    !!process.env.NEXT_PUBLIC_TX_MULTI_BROADCAST_TYPE;

  return hasStrategyDefined
    ? {
        splitExecutionsStrategy: {
          singleTx: (process.env.NEXT_PUBLIC_TX_SINGLE_BROADCAST_TYPE ??
            DEFAULT_PROCESS_TX_STRATEGY.splitExecutionsStrategy?.singleTx!) as BroadcastMethodType,
          multiTx: (process.env.NEXT_PUBLIC_TX_MULTI_BROADCAST_TYPE ??
            !DEFAULT_PROCESS_TX_STRATEGY.splitExecutionsStrategy?.multiTx!) as BroadcastMethodType,
        },
        fallbackSequence: process.env.NEXT_PUBLIC_TX_FALLBACK_SEQUENCE
          ? JSON.parse(process.env.NEXT_PUBLIC_TX_FALLBACK_SEQUENCE)
          : DEFAULT_PROCESS_TX_STRATEGY.fallbackSequence,
      }
    : undefined;
}

export function getAccountCreationKey(txns: SolanaTransaction[]) {
  const tx = txns.find((tx) => tx.type === TransactionType.CREATE_ACCOUNT);

  if (!tx) {
    return undefined;
  }

  if (isV0Tx(tx)) {
    const addressLookupTableAccounts = tx.addressLookupTables ?? [];
    const message = decompileV0Transaction(tx, addressLookupTableAccounts);
    const idl = { ...MARGINFI_IDL, address: new PublicKey(0) } as unknown as MarginfiIdlType;
    const decoded = message.instructions.map((ix) => decodeInstruction(idl, ix.data));

    const accountCreationIx = decoded.find((ix) => ix?.name === "marginfi_account_initialize");

    // todo complete
    return undefined;
  } else {
    const idl = { ...MARGINFI_IDL, address: new PublicKey(0) } as unknown as MarginfiIdlType;
    const decoded = tx.instructions.map((ix) => decodeInstruction(idl, ix.data));

    const accountCreationIndex = decoded.findIndex((ix) => ix?.name === "marginfi_account_initialize");

    const key = tx.instructions[accountCreationIndex].keys[1]; // second key corrensponds to account

    return key.pubkey;
  }
}

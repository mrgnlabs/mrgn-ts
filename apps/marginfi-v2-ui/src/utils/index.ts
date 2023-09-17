import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { useEffect, useRef } from "react";

// ================ development utils ================

export const FAUCET_PROGRAM_ID = new PublicKey("4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt");

export function makeAirdropCollateralIx(
  amount: number,
  mint: PublicKey,
  tokenAccount: PublicKey,
  faucet: PublicKey
): TransactionInstruction {
  const [faucetPda] = PublicKey.findProgramAddressSync([Buffer.from("faucet")], FAUCET_PROGRAM_ID);

  const keys = [
    { pubkey: faucetPda, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: faucet, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: FAUCET_PROGRAM_ID,
    data: Buffer.from([1, ...new BN(amount).toArray("le", 8)]),
    keys,
  });
}

export function isWholePosition(activeBankInfo: ActiveBankInfo, amount: number): boolean {
  const positionTokenAmount =
    Math.floor(activeBankInfo.position.amount * Math.pow(10, activeBankInfo.info.state.mintDecimals)) /
    Math.pow(10, activeBankInfo.info.state.mintDecimals);
  return amount >= positionTokenAmount;
}

const DEFAULT_TICKS_PER_SECOND = 160;
const DEFAULT_TICKS_PER_SLOT = 64;
const SECONDS_PER_DAY = 24 * 60 * 60;
const TICKS_PER_DAY = DEFAULT_TICKS_PER_SECOND * SECONDS_PER_DAY;
const DEFAULT_SLOTS_PER_EPOCH = (2 * TICKS_PER_DAY) / DEFAULT_TICKS_PER_SLOT;
const DEFAULT_S_PER_SLOT = DEFAULT_TICKS_PER_SLOT / DEFAULT_TICKS_PER_SECOND;
const SECONDS_PER_EPOCH = DEFAULT_SLOTS_PER_EPOCH * DEFAULT_S_PER_SLOT;
export const EPOCHS_PER_YEAR = (SECONDS_PER_DAY * 365.25) / SECONDS_PER_EPOCH;

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
export { OKXWalletAdapter } from "./OKXWalletAdapter";

import { useEffect, useRef } from "react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";
import { TOKEN_PROGRAM_ID, aprToApy, ceil, floor, percentFormatter } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActiveBankInfo, Emissions } from "@mrgnlabs/mrgn-state";

import { LendingModes } from "./types";
import { handleError } from "./errors";

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

export function computeBankRateRaw(bank: ExtendedBankInfo, lendingMode: LendingModes) {
  const isInLendingMode = lendingMode === LendingModes.LEND;

  const interestRate = isInLendingMode ? bank.info.state.lendingRate : bank.info.state.borrowingRate;
  const emissionRate = isInLendingMode
    ? bank.info.state.emissions == Emissions.Lending
      ? bank.info.state.emissionsRate
      : 0
    : bank.info.state.emissions == Emissions.Borrowing
      ? bank.info.state.emissionsRate
      : 0;

  const aprRate = interestRate + emissionRate;
  const apyRate = aprToApy(aprRate);

  return apyRate;
}

export function computeBankRate(bank: ExtendedBankInfo, lendingMode: LendingModes) {
  const apyRate = computeBankRateRaw(bank, lendingMode);
  return percentFormatter.format(apyRate);
}

export function computeClosePositionTokenAmount(activeBankInfo: ActiveBankInfo): number {
  const closePositionTokenAmount = activeBankInfo.position.isLending
    ? floor(activeBankInfo.position.amount, activeBankInfo.info.state.mintDecimals)
    : ceil(activeBankInfo.position.amount, activeBankInfo.info.state.mintDecimals);
  return closePositionTokenAmount;
}

export function isWholePosition(activeBankInfo: ActiveBankInfo, amount: number): boolean {
  const closePositionTokenAmount = computeClosePositionTokenAmount(activeBankInfo);
  return amount >= closePositionTokenAmount;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function getInitHealthColor(health: number): string {
  if (health >= 0.5) {
    return "#75BA80"; // green color " : "#",
  } else if (health >= 0.25) {
    return "#b8b45f"; // yellow color
  } else {
    return "#CF6F6F"; // red color
  }
}

export function getMaintHealthColor(health: number): string {
  if (health >= 0.5) {
    return "#75BA80"; // green color " : "#",
  } else if (health >= 0.25) {
    return "#b8b45f"; // yellow color
  } else {
    return "#CF6F6F"; // red color
  }
}

export function getLiquidationPriceColor(currentPrice: number, liquidationPrice: number): string {
  const safety = liquidationPrice / currentPrice;
  let color: string;
  if (safety >= 0.5) {
    color = "#75BA80";
  } else if (safety >= 0.25) {
    color = "#B8B45F";
  } else {
    color = "#CF6F6F";
  }
  return color;
}

export function extractErrorString(error: any, fallback?: string): string {
  const errorCode = handleError(error, null, false);

  if (errorCode?.description) {
    return errorCode.description;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback ?? "Unrecognized error";
}

export function getTokenImageURL(
  bank: ExtendedBankInfo | PublicKey | string,
  baseUrl: string = "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/"
): string {
  const verifyPublicKey = (key: ExtendedBankInfo | PublicKey | string) => {
    try {
      if (typeof key === "string") {
        const _ = new PublicKey(key).toBytes();
        return true;
      }
      if (key instanceof PublicKey) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const isPublicKey = verifyPublicKey(bank);

  if (typeof bank === "string") {
    try {
      return `${baseUrl}${new PublicKey(bank).toBase58()}.png`;
    } catch (error) {
      // If the string is not a valid public key, return a default image or handle the error
      return `${baseUrl}default.png`;
    }
  }

  if (bank instanceof PublicKey) {
    return `${baseUrl}${bank.toBase58()}.png`;
  }

  return `${baseUrl}${bank.info.rawBank.mint.toBase58()}.png`;
}

export function isBankOracleStale(bank: ExtendedBankInfo) {
  // switchboard pull oracles are UI cranked so should never be stale
  if (bank.info.rawBank.config.oracleSetup === OracleSetup.SwitchboardPull) {
    return false;
  }

  const maxAge = bank.info.rawBank.config.oracleMaxAge;

  const threshold = maxAge + 3 * 60; // seconds
  const currentTime = Math.round(Date.now() / 1000);
  const oracleTime = Math.round(
    bank.info.oraclePrice.timestamp ? bank.info.oraclePrice.timestamp.toNumber() : new Date().getTime()
  );
  const isStale = currentTime - oracleTime > threshold;

  return isStale;
}

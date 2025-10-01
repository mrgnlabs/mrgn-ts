import { PublicKey, TransactionInstruction, Connection, AddressLookupTableAccount } from "@solana/web3.js";

import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { WalletContextState } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";

import { WalletContextStateOverride } from "../wallet";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { ActionProcessingError } from "./types";
import { STATIC_SIMULATION_ERRORS } from "../errors";

// ------------------------------------------------------------------//
// Helpers //
// ------------------------------------------------------------------//

// PDA not being able to create a bank?
export async function getMaybeSquadsOptions(walletContextState?: WalletContextState | WalletContextStateOverride) {
  // If the connected wallet is SquadsX, use the ephemeral signer address provided by the wallet to create the marginfi account.
  const adapter = walletContextState?.wallet?.adapter;
  const ephemeralSignerAddress =
    adapter &&
    "standard" in adapter &&
    "fuse:getEphemeralSigners" in adapter.wallet.features &&
    // @ts-ignore
    (await adapter.wallet.features["fuse:getEphemeralSigners"].getEphemeralSigners(1))[0];
  const ephemeralSignerPubkey = ephemeralSignerAddress ? new PublicKey(ephemeralSignerAddress) : undefined;

  return ephemeralSignerPubkey ? { newAccountKey: ephemeralSignerPubkey } : undefined;
}

export function deserializeInstruction(instruction: any) {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
}

export async function getAdressLookupTableAccounts(
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
}

export const formatAmount = (
  newAmount: string,
  maxAmount: number | null,
  bank: ExtendedBankInfo | WalletToken | null,
  numberFormater: Intl.NumberFormat
) => {
  let formattedAmount: string, amount: number;
  // Remove commas from the formatted string
  const newAmountWithoutCommas = newAmount.replace(/,/g, "");
  let decimalPart = newAmountWithoutCommas.split(".")[1];
  const mintDecimals = bank ? ("info" in bank ? bank.info.state.mintDecimals : bank.mintDecimals) : 9;

  if (
    (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
    !newAmount.substring(0, newAmount.length - 1).includes(".")
  ) {
    amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
    formattedAmount = numberFormater.format(amount).concat(".");
  } else {
    const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
    if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
    decimalPart = isDecimalPartInvalid
      ? ""
      : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
    amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
    formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
  }

  if (maxAmount && amount > maxAmount) {
    return numberFormater.format(maxAmount);
  } else {
    return formattedAmount;
  }
};

export async function getSwapQuoteWithRetry(
  quoteParams: QuoteGetRequest,
  maxRetries = 5,
  timeout = 1500
): Promise<QuoteResponse> {
  const jupiterQuoteApi = createJupiterApiClient({
    basePath: "https://lite-api.jup.ag/swap/v1",
  });
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const swapQuote = await jupiterQuoteApi.quoteGet(quoteParams);
      return swapQuote; // Success, return the result
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed`);
      attempt++;
      if (attempt === maxRetries) {
        console.error(`Failed to get to quote after ${maxRetries} attempts`);
        throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.JUP_QUOTE_FAILED);
      }
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }
  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.JUP_QUOTE_FAILED);
}

export const debounceFn = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

function detectBroadcastType(signature: string): "RPC" | "BUNDLE" | "UNKNOWN" {
  const isHex = /^[0-9a-fA-F]{64}$/.test(signature);

  if (isHex) return "BUNDLE";

  try {
    const decoded = bs58.decode(signature);
    if (decoded.length === 64) return "RPC";
  } catch (e) {
    return "UNKNOWN";
  }

  return "UNKNOWN";
}

export function composeExplorerUrl(signature?: string): string | undefined {
  if (!signature) return undefined;

  const detectedBroadcastType = detectBroadcastType(signature);

  switch (detectedBroadcastType) {
    case "RPC":
      return `https://solscan.io/tx/${signature}`;
    case "BUNDLE":
      return `https://explorer.jito.wtf/bundle/${signature}`;
    default:
      return signature;
  }
}

export async function logActivity(
  type: string,
  txn: string,
  details: Record<string, any>,
  account?: PublicKey
): Promise<void> {
  try {
    const mfiAccount = account ? account.toBase58() : localStorage.getItem("mfiAccount");
    const response = await fetch("/api/activity/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        txn,
        details,
        mfiAccount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to log activity: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

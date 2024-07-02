import { QuoteResponse, SwapRequest, createJupiterApiClient } from "@jup-ag/api";
import * as Sentry from "@sentry/nextjs";
import {
  AddressLookupTableAccount,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { LUT_PROGRAM_AUTHORITY_INDEX, Wallet, processTransaction, uiToNative } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, FEE_MARGIN, ActionType, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";

import { WalletContextStateOverride } from "~/hooks/useWalletContext";
import { LstData, SOL_MINT } from "~/store/lstStore";

import { MultiStepToastHandle, showErrorToast } from "./toastUtils";
import { isWholePosition, extractErrorString } from "./mrgnUtils";
import { StakeData, makeDepositSolToStakePoolIx, makeDepositStakeToStakePoolIx } from "./lstUtils";
import {
  LoopingObject,
  LoopingOptions,
  TradeSide,
  getLoopingTransaction,
} from "~/components/common/TradingBox/tradingBox.utils";
import { ToastStep } from "~/components/common/Toast";
import { getMaybeSquadsOptions } from "./mrgnActions";

export async function closePosition({
  marginfiAccount,
  depositBank,
  borrowBank,
  priorityFee,
  slippageBps,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  priorityFee: number;
  slippageBps: number;
}) {
  const jupiterQuoteApi = createJupiterApiClient();
}

export async function executeLeverageAction({
  marginfiClient,
  marginfiAccount: _marginfiAccount,
  depositBank,
  borrowBank,
  walletContextState,
  connection,
  depositAmount,
  tradeState,
  loopingObject: _loopingObject,
  priorityFee,
  slippageBps,
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper | null;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  connection: Connection;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  depositAmount: number;
  tradeState: TradeSide;
  loopingObject: LoopingObject | null;
  priorityFee?: number;
  slippageBps: number;
}) {
  if (marginfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return;
  }

  if (_loopingObject === null) {
    showErrorToast("Leverage routing not ready");
    return;
  }

  let toastSteps: ToastStep[] = [];
  const tradeActionLabel = tradeState === "long" ? "longing" : "shorting";

  if (!_marginfiAccount) {
    toastSteps.push(...[{ label: "Creating account" }]);
  }

  if (!_loopingObject.loopingTxn) {
    toastSteps.push(...[{ label: `Generating transaction` }]);
  }

  toastSteps.push({ label: `Executing ${tradeState.slice(0, 1).toUpperCase() + tradeState.slice(1)} position` });

  const multiStepToast = new MultiStepToastHandle(
    `${tradeState.slice(0, 1).toUpperCase() + tradeState.slice(1)} 
      ${tradeState === "long" ? depositBank.meta.tokenSymbol : borrowBank.meta.tokenSymbol}`,
    toastSteps
  );
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper | null = _marginfiAccount;
  let loopingObject: LoopingObject | null = _loopingObject;

  if (!marginfiAccount) {
    try {
      const squadsOptions = await getMaybeSquadsOptions(walletContextState);
      marginfiAccount = await marginfiClient.createMarginfiAccount(undefined, squadsOptions);

      clearAccountCache(marginfiClient.provider.publicKey);

      multiStepToast.setSuccessAndNext();
    } catch (error: any) {
      const msg = extractErrorString(error);
      Sentry.captureException({ message: error });
      multiStepToast.setFailed(msg);
      console.log(`Error while depositing: ${msg}`);
      console.log(error);
      return;
    }
  }

  if (!loopingObject.loopingTxn) {
    try {
      const borrowAmountNative = uiToNative(loopingObject.borrowAmount, borrowBank.info.state.mintDecimals).toNumber();
      loopingObject = await getLoopingTransaction({
        marginfiAccount,
        borrowAmountNative,
        borrowBank,
        depositBank,
        amount: depositAmount,
        borrowAmount: loopingObject.borrowAmount,
        slippageBps,
        connection,
        loopObject: loopingObject,
        priorityFee,
      });

      if (!loopingObject?.loopingTxn) {
        throw new Error("Something went wrong, please try again.");
      } else {
        marginfiAccount;
        multiStepToast.setSuccessAndNext();
      }
    } catch (error) {
      const msg = extractErrorString(error);
      Sentry.captureException({ message: error });
      multiStepToast.setFailed(msg);
      console.log(`Error while ${tradeActionLabel}: ${msg}`);
      console.log(error);
      return;
    }
  }

  try {
    if (loopingObject.loopingTxn) {
      const txnSig = await marginfiClient.processTransaction(loopingObject.loopingTxn);
      multiStepToast.setSuccessAndNext();
      return txnSig;
    } else {
      throw new Error("Something went wrong, please try again.");
    }
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

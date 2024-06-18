import React from "react";
import { ActionType, AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiAccountWrapper,
  MarginfiClient,
  ProcessTransactionError,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";

import {
  ActionPreview,
  CalculatePreviewProps,
  PreviewStat,
  SimulateLoopingActionProps,
  calculatePreview,
  generateStats,
  simulateLooping,
} from "./LoopPreview.utils";
import { ActionMethod, LoopingOptions, usePrevious } from "~/utils";
import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/react-hook";
import { VersionedTransaction } from "@solana/web3.js";

interface UseLoopingPreviewProps {
  marginfiClient: MarginfiClient | null;
  accountSummary: AccountSummary;
  account: MarginfiAccountWrapper | null;
  bank: ExtendedBankInfo | null;
  loopOptions?: LoopingOptions;
}

export function useLoopingPreview({
  marginfiClient,
  accountSummary,
  account,
  bank,
  loopOptions,
}: UseLoopingPreviewProps) {
  const [simulationResult, setSimulationResult] = React.useState<SimulationResult>();
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const [previewStats, setPreviewStats] = React.useState<PreviewStat[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [actionMethod, setActionMethod] = React.useState<ActionMethod>();

  const txnPrev = usePrevious(loopOptions?.loopingTxn);

  React.useEffect(() => {
    if (bank) {
      getPreviewStats({ simulationResult, bank, loopOptions, accountSummary, isLoading });
    }
  }, [simulationResult, bank, loopOptions, accountSummary, isLoading]);

  const getPreviewStats = (props: CalculatePreviewProps) => {
    const preview = calculatePreview(props);
    setPreview(preview);
    setPreviewStats(generateStats(preview, props.bank, props.isLoading));
  };

  const getSimulationResult = React.useCallback(
    async (loopingTxn: VersionedTransaction | null) => {
      const props = {
        marginfiClient,
        account,
        bank,
        loopingTxn,
      } as SimulateLoopingActionProps;

      try {
        setSimulationResult(await simulateLooping(props));
        setActionMethod(undefined);
      } catch (error: any) {
        if (error instanceof ProcessTransactionError && error.programId) {
          if (error.programId === JUPITER_PROGRAM_V6_ID.toBase58() && error.message === "Slippage tolerance exceeded") {
            setActionMethod({
              isEnabled: true,
              actionMethod: "WARNING",
              description: error.message,
            } as ActionMethod);
          } else {
            setActionMethod({
              isEnabled: true,
              actionMethod: "WARNING",
              description: `Simulating health/liquidation impact failed.`,
            } as ActionMethod);
          }
        } else if (typeof error === "string") {
          setActionMethod({
            isEnabled: true,
            actionMethod: "WARNING",
            description: "Simulating health/liquidation impact failed.",
          } as ActionMethod);
        } else if (error?.message && (error?.message.includes("RangeError") || error?.message.includes("too large"))) {
          setActionMethod({
            isEnabled: false,
            actionMethod: "WARNING",
            description:
              "This swap causes the transaction to fail due to size restrictions. Please try again or pick another token.",
            link: "https://forum.marginfi.community/t/work-were-doing-to-improve-collateral-repay/333",
          } as ActionMethod);
        } else if (error?.message && error?.message.includes("6017")) {
          setActionMethod({
            isEnabled: true,
            actionMethod: "WARNING",
            description: "Stale oracle data.",
          } as ActionMethod);
        } else {
          setActionMethod({
            isEnabled: true,
            actionMethod: "WARNING",
            description: "Simulating health/liquidation impact failed.",
          } as ActionMethod);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [marginfiClient, account, bank]
  );

  React.useEffect(() => {
    const prevSerializedTxn = txnPrev?.serialize();
    const serializedTxn = loopOptions?.loopingTxn?.serialize();

    const isUnchanged = compareSerializedArrays(prevSerializedTxn, serializedTxn);

    if (isUnchanged) return;

    if (loopOptions?.loopingTxn) {
      getSimulationResult(loopOptions?.loopingTxn);
    } else {
      setSimulationResult(undefined);
      setActionMethod(undefined);
      setIsLoading(false);
    }
  }, [getSimulationResult, loopOptions?.loopingTxn, txnPrev]);

  return { preview, previewStats, isLoading, actionMethod };
}

function compareSerializedArrays(arr1: Uint8Array | undefined, arr2: Uint8Array | undefined): boolean {
  if (arr1 === undefined && arr2 === undefined) return true;

  if (arr1 === undefined || arr2 === undefined) return false;

  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

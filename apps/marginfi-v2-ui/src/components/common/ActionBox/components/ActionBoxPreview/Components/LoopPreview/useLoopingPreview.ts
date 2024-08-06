import React from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, handleSimulationError, LoopingOptions, usePrevious } from "@mrgnlabs/mrgn-utils";

import {
  ActionPreview,
  CalculatePreviewProps,
  PreviewStat,
  SimulateLoopingActionProps,
  calculatePreview,
  generateStats,
  simulateLooping,
} from "./LoopPreview.utils";

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
        const method = handleSimulationError(error, props.bank, false, "Looping");
        setActionMethod(method);
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

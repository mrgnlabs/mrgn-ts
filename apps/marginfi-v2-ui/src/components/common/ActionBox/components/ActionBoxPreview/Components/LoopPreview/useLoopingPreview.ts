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
  SimulateActionProps,
  calculatePreview,
  generateStats,
  simulateLooping,
} from "./LoopPreview.utils";
import { ActionMethod, LoopingOptions, RepayWithCollatOptions, usePrevious } from "~/utils";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/react-hook";

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

  const bankPrev = usePrevious(bank);

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
    async (loopOptions: LoopingOptions) => {
      const props = {
        marginfiClient,
        account,
        bank,
        loopOptions,
      } as SimulateActionProps;

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
    const isBankChanged = bank ? !bankPrev?.address.equals(bank.address) : false;

    console.log({ bank, prev: bankPrev?.address, getSimulationResult, loopOptions });

    if (loopOptions && !isBankChanged) {
      console.log("hit");
      getSimulationResult(loopOptions);
    } else {
      setSimulationResult(undefined);
      setActionMethod(undefined);
      setIsLoading(false);
    }
  }, [loopOptions]);

  return { preview, previewStats, isLoading, actionMethod };
}

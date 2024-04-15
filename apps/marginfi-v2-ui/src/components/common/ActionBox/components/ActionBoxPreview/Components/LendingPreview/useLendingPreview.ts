import React from "react";
import { ActionType, AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import {
  ActionPreview,
  CalculatePreviewProps,
  PreviewStat,
  SimulateActionProps,
  calculatePreview,
  generateStats,
  simulateAction,
} from "./LendingPreview.utils";
import { ActionMethod, RepayWithCollatOptions, usePrevious } from "~/utils";
import { useDebounce } from "~/hooks/useDebounce";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";

interface UseLendingPreviewProps {
  accountSummary: AccountSummary;
  actionMode: ActionType;
  account: MarginfiAccountWrapper | null;
  bank: ExtendedBankInfo | null;
  amount: number | null;
  repayWithCollatOptions?: RepayWithCollatOptions;
}

export function useLendingPreview({
  accountSummary,
  actionMode,
  account,
  bank,
  amount,
  repayWithCollatOptions,
}: UseLendingPreviewProps) {
  const [simulationResult, setSimulationResult] = React.useState<SimulationResult>();
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const [previewStats, setPreviewStats] = React.useState<PreviewStat[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [actionMethod, setActionMethod] = React.useState<ActionMethod>();

  const bankPrev = usePrevious(bank);
  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  React.useEffect(() => {
    const isBankChanged = bank ? !bankPrev?.address.equals(bank.address) : false;

    if (account && bank && debouncedAmount && !isBankChanged) {
      getSimulationResult({ actionMode, account, bank, amount: debouncedAmount, repayWithCollatOptions });
    } else {
      setSimulationResult(undefined);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionMode, account, bankPrev, bank, debouncedAmount, repayWithCollatOptions?.repayCollatQuote]);

  React.useEffect(() => {
    if (bank) {
      getPreviewStats({ simulationResult, bank, repayWithCollatOptions, actionMode, accountSummary, isLoading });
    }
  }, [simulationResult, bank, repayWithCollatOptions, accountSummary, actionMode, isLoading]);

  const getPreviewStats = (props: CalculatePreviewProps) => {
    const isLending = props.actionMode === ActionType.Deposit || props.actionMode === ActionType.Withdraw;
    const preview = calculatePreview(props);
    setPreview(preview);
    setPreviewStats(generateStats(preview, props.bank, isLending, props.isLoading));
  };

  const getSimulationResult = async (props: SimulateActionProps) => {
    try {
      setSimulationResult(await simulateAction(props));
      setActionMethod(undefined);
    } catch (error: any) {
      if (typeof error === "string") {
        setActionMethod({
          isEnabled: true,
          actionMethod: "WARNING",
          description: "Simulating health/liquidation impact failed.",
        } as ActionMethod);
      } else if (error?.message && (error?.message.includes("RangeError") || error?.message.includes("too large"))) {
        setActionMethod({
          isEnabled: false,
          actionMethod: "WARNING",
          description: "The txn required for this swap is too large, please try another token.", //Click here to learn more.
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
  };

  return { preview, previewStats, isLoading, actionMethod };
}

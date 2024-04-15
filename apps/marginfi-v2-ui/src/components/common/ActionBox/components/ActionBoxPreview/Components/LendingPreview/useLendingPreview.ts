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
import { RepayWithCollatOptions } from "~/utils";
import { useDebounce } from "~/hooks/useDebounce";

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
  const debouncedAmount = useDebounce<number | null>(amount, 500);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  React.useEffect(() => {
    if (account && bank && debouncedAmount) {
      getSimulationResult({ actionMode, account, bank, amount: debouncedAmount, repayWithCollatOptions });
    } else {
      setSimulationResult(undefined);
      setIsLoading(false);
    }
  }, [actionMode, account, bank, debouncedAmount, repayWithCollatOptions]);

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
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  return { preview, previewStats, isLoading };
}

import React from "react";
import { ActionType, AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, handleSimulationError, RepayWithCollatOptions, usePrevious } from "@mrgnlabs/mrgn-utils";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { ActionSummary, simulateAction, SimulateActionProps } from "../utils/LendingPreviewUtils";

interface UseLendingPreviewProps {
  marginfiClient: MarginfiClient | null;
  accountSummary: AccountSummary;
  actionMode: ActionType;
  account: MarginfiAccountWrapper | null;
  bank: ExtendedBankInfo | null;
  amount: number | null;
  repayWithCollatOptions?: RepayWithCollatOptions;
}

export function useLendingPreview({
  marginfiClient,
  accountSummary,
  actionMode,
  account,
  bank,
  amount,
  repayWithCollatOptions,
}: UseLendingPreviewProps) {
  const [simulationResult, setSimulationResult] = React.useState<SimulationResult>();
  const [preview, setPreview] = React.useState<ActionSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [actionMethod, setActionMethod] = React.useState<ActionMethod>();

  const bankPrev = usePrevious(bank);
  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  // React.useEffect(() => {
  //   const isBankChanged = bank ? !bankPrev?.address.equals(bank.address) : false;

  //   if (account && bank && debouncedAmount && !isBankChanged && amount !== 0) {
  //     getSimulationResult(debouncedAmount);
  //   } else {
  //     setSimulationResult(undefined);
  //     setActionMethod(undefined);
  //     setIsLoading(false);
  //   }
  // }, [actionMode, account, bankPrev, bank, debouncedAmount]);

  // React.useEffect(() => {
  //   if (bank) {
  //     getPreviewStats({ simulationResult, bank, repayWithCollatOptions, actionMode, accountSummary, isLoading });
  //   }
  // }, [simulationResult, bank, repayWithCollatOptions, accountSummary, actionMode, isLoading]);

  // const getPreviewStats = (props: CalculatePreviewProps) => {
  //   const isLending =
  //     props.actionMode === ActionType.Deposit ||
  //     props.actionMode === ActionType.Withdraw ||
  //     props.actionMode === ActionType.Loop;
  //   const isRepayWithCollat = !!props.repayWithCollatOptions;

  //   const preview = calculatePreview(props);
  //   setPreview(preview);
  //   setPreviewStats(generateStats(preview, props.bank, isLending, props.isLoading, isRepayWithCollat));
  // };

  return { preview, isLoading, actionMethod };
}

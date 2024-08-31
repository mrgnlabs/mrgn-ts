import React from "react";
import { ActionType, AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, handleSimulationError, RepayWithCollatOptions, usePrevious } from "@mrgnlabs/mrgn-utils";

import {
  ActionPreview,
  CalculatePreviewProps,
  PreviewStat,
  SimulateActionProps,
  calculatePreview,
  generateStats,
  simulateAction,
} from "./LendingPreview.utils";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { VersionedTransaction } from "@solana/web3.js";

interface UseLendingPreviewProps {
  marginfiClient: MarginfiClient | null;
  accountSummary: AccountSummary;
  actionMode: ActionType;
  account: MarginfiAccountWrapper | null;
  bank: ExtendedBankInfo | null;
  amount: number | null;
  repayWithCollatOptions?: RepayWithCollatOptions;
  borrowWithdrawOptions?: {
    actionTx: VersionedTransaction | null;
    feedCrankTxs: VersionedTransaction[];
  };
}

export function useLendingPreview({
  marginfiClient,
  accountSummary,
  actionMode,
  account,
  bank,
  amount,
  repayWithCollatOptions,
  borrowWithdrawOptions,
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

    if (account && marginfiClient && bank && debouncedAmount && !isBankChanged && amount !== 0) {
      getSimulationResult({
        marginfiClient,
        actionMode,
        account,
        bank,
        amount: debouncedAmount,
        repayWithCollatOptions,
        borrowWithdrawOptions,
      });
    } else {
      setSimulationResult(undefined);
      setActionMethod(undefined);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionMode, account, bankPrev, bank, debouncedAmount, repayWithCollatOptions?.repayCollatQuote]);

  React.useEffect(() => {
    if (bank) {
      getPreviewStats({
        simulationResult,
        bank,
        repayWithCollatOptions,
        actionMode,
        accountSummary,
        isLoading,
        borrowWithdrawOptions,
      });
    }
  }, [simulationResult, bank, repayWithCollatOptions, accountSummary, actionMode, isLoading, borrowWithdrawOptions]);

  const getPreviewStats = (props: CalculatePreviewProps) => {
    const isLending =
      props.actionMode === ActionType.Deposit ||
      props.actionMode === ActionType.Withdraw ||
      props.actionMode === ActionType.Loop;
    const isRepayWithCollat = !!props.repayWithCollatOptions;

    const preview = calculatePreview(props);
    setPreview(preview);
    setPreviewStats(generateStats(preview, props.bank, isLending, props.isLoading, isRepayWithCollat));
  };

  const getSimulationResult = async (props: SimulateActionProps) => {
    try {
      setSimulationResult(await simulateAction(props));
      setActionMethod(undefined);
    } catch (error: any) {
      let actionString;
      switch (props.actionMode) {
        case ActionType.Deposit:
          actionString = "Depositing";
          break;
        case ActionType.Withdraw:
          actionString = "Withdrawing";
          break;
        case ActionType.Loop:
          actionString = "Looping";
          break;
        case ActionType.Repay:
          actionString = "Repaying";
          break;
        case ActionType.Borrow:
          actionString = "Borrowing";
          break;
        default:
          actionString = "The action";
      }
      const method = handleSimulationError(error, props.bank, false, actionString);
      setActionMethod(method);
    } finally {
      setIsLoading(false);
    }
  };

  return { preview, previewStats, isLoading, actionMethod };
}

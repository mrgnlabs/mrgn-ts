import React, { useRef } from "react";
import { ActionType, AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { handleSimulationError } from "@mrgnlabs/mrgn-utils";

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
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { BorrowLendObject, calculateBorrowLend } from "~/store/actionBoxStore";

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
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const [previewStats, setPreviewStats] = React.useState<PreviewStat[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [actionMethod, setActionMethod] = React.useState<ActionMethod>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const bankPrev = usePrevious(bank);
  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);
  const prevDebouncedAmount = usePrevious(debouncedAmount);

  React.useEffect(() => {
    if (amount && amount !== prevDebouncedAmount) {
      setIsLoading(true);
    }
  }, [amount, prevDebouncedAmount]);

  const getSimulationResultCb = React.useCallback(
    async (amountArg: number, controller: AbortController) => {
      const isBankChanged = bank ? !bankPrev?.address.equals(bank.address) : false;

      if (account && marginfiClient && bank && debouncedAmount && !isBankChanged && amount !== 0) {
        let borrowWithdrawOptions: BorrowLendObject | undefined;
        if (actionMode === ActionType.Borrow || actionMode === ActionType.Withdraw) {
          try {
            borrowWithdrawOptions = await calculateBorrowLend(account, actionMode, bank, amountArg);
            if (controller.signal.aborted) {
              return;
            }
          } catch (error) {
            // TODO: eccountered error,  handle setErrorMessage
            console.error("Error fetching borrowWithdrawOptions");
          }
        }

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
    },
    [account, actionMode, amount, bank, bankPrev?.address, debouncedAmount, marginfiClient, repayWithCollatOptions]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      getSimulationResultCb(debouncedAmount ?? 0, controller);

      return () => {
        controller.abort();
        setIsLoading(false);
      };
    }
  }, [prevDebouncedAmount, debouncedAmount, getSimulationResultCb]);

  React.useEffect(() => {
    if (bank) {
      getPreviewStats({ simulationResult, bank, repayWithCollatOptions, actionMode, accountSummary, isLoading });
    }
  }, [simulationResult, bank, repayWithCollatOptions, accountSummary, actionMode, isLoading]);

  const getPreviewStats = (props: CalculatePreviewProps) => {
    const isLending = props.actionMode === ActionType.Deposit || props.actionMode === ActionType.Withdraw;
    const isRepayWithCollat = !!props.repayWithCollatOptions;
    const preview = calculatePreview(props);
    setPreview(preview);
    setPreviewStats(generateStats(preview, props.bank, isLending, props.isLoading, isRepayWithCollat));
  };

  const getSimulationResult = async (props: SimulateActionProps) => {
    try {
      const result = await simulateAction(props);
      setSimulationResult(result);
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
      const actionMethod = handleSimulationError(error, props.bank, false, actionString);

      if (actionMethod) setActionMethod(actionMethod);
    } finally {
      setIsLoading(false);
    }
  };

  return { preview, previewStats, isLoading, actionMethod };
}

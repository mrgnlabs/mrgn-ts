import React, { useRef } from "react";
import { ActionType, AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, handleSimulationError, RepayWithCollatOptions, usePrevious } from "@mrgnlabs/mrgn-utils";

import {
  ActionPreview,
  CalculatePreviewProps,
  PreviewStat,
  calculatePreview,
  generateStats,
  simulateAction,
} from "./LendingPreview.utils";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { VersionedTransaction } from "@solana/web3.js";
import { calculateBorrowLend } from "~/store/actionBoxStore";

interface UseLendingPreviewProps {
  marginfiClient: MarginfiClient | null;
  accountSummary: AccountSummary;
  actionMode: ActionType;
  account: MarginfiAccountWrapper | null;
  bank: ExtendedBankInfo | null;
  amount: number | null;
  repayWithCollatOptions?: RepayWithCollatOptions;
  setLoadingState: (isLoading: boolean) => void;
  setActionTxns: (actionTxns: { actionTxn: VersionedTransaction | null; feedCrankTxs: VersionedTransaction[] }) => void;
}

export function useLendingPreview({
  marginfiClient,
  accountSummary,
  actionMode,
  account,
  bank,
  amount,
  repayWithCollatOptions,
  setLoadingState,
  setActionTxns,
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
    setIsLoading(true);
  }, [amount]);

  const getSimulationResultCb = React.useCallback(
    async (amountArg: number, controller: AbortController) => {
      if (!marginfiClient || !account || !bank || !amountArg) {
        return;
      }

      setLoadingState(true);
      setIsLoading(true);

      let borrowWithdrawObject;
      if (actionMode === ActionType.Borrow || actionMode === ActionType.Withdraw) {
        try {
          borrowWithdrawObject = await calculateBorrowLend(account, actionMode, bank, amountArg);
          if (controller.signal.aborted) {
            return;
          }

          if (borrowWithdrawObject) {
            setActionTxns({ actionTxn: borrowWithdrawObject.actionTx, feedCrankTxs: borrowWithdrawObject.bundleTipTxs });
          } else {
            // TODO: handle setErrorMessage
            console.error("No borrowWithdrawObject");
          }
        } catch (error) {
          // TODO: eccountered error,  handle setErrorMessage
          console.error("Error fetching borrowWithdrawObject");
        }
      }

      try {
        const simulationResult = await simulateAction({
          marginfiClient,
          actionMode,
          account,
          bank,
          amount: amountArg,
          repayWithCollatOptions,
          borrowWithdrawOptions: {
            actionTx: borrowWithdrawObject?.actionTx ?? null,
            feedCrankTxs: borrowWithdrawObject?.bundleTipTxs ?? [],
          },
        });
        if (controller.signal.aborted) {
          return;
        }

        setSimulationResult(simulationResult);
        setActionMethod(undefined);
      } catch (error: any) {
        let actionString;
        switch (actionMode) {
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
        const method = handleSimulationError(error, bank, false, actionString);
        setActionMethod(method);
      } finally {
        setLoadingState(false);
        setIsLoading(false);
      }
    },
    [marginfiClient, account, bank, actionMode, repayWithCollatOptions, setActionTxns, setLoadingState]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      console.log("debouncedAmount", debouncedAmount);
      console.log("prevDebouncedAmount", prevDebouncedAmount);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      getSimulationResultCb(debouncedAmount ?? 0, abortControllerRef.current);
    }
  }, [prevDebouncedAmount, debouncedAmount, getSimulationResultCb]);

  React.useEffect(() => {
    const isBankChanged = bank ? !bankPrev?.address.equals(bank.address) : false;

    if (isBankChanged) {
      setSimulationResult(undefined);
      setActionMethod(undefined);
      setIsLoading(false);
    }
  }, [bank, bankPrev]);

  React.useEffect(() => {
    if (bank) {
      getPreviewStats({
        simulationResult,
        bank,
        repayWithCollatOptions,
        actionMode,
        accountSummary,
        isLoading,
      });
    }
  }, [simulationResult, bank, repayWithCollatOptions, accountSummary, actionMode, isLoading]);

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

  return { preview, previewStats, isLoading, actionMethod };
}

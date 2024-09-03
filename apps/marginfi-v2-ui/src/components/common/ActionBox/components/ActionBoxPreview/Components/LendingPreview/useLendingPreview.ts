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

  const bankPrev = usePrevious(bank);
  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);
  const prevDebouncedAmount = usePrevious(debouncedAmount);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  const fetchBorrowWithdrawObject = React.useCallback(
    async (bank: ExtendedBankInfo, account: MarginfiAccountWrapper, amount: number, actionMode: ActionType) => {
      if (amount === 0) {
        return;
      }

      if (actionMode !== ActionType.Borrow && actionMode !== ActionType.Withdraw) {
        return;
      }

      setLoadingState(true);
      try {
        const borrowWithdrawObject = await calculateBorrowLend(account, actionMode, bank, amount);

        if (borrowWithdrawObject) {
          setActionTxns({ actionTxn: borrowWithdrawObject.actionTx, feedCrankTxs: borrowWithdrawObject.bundleTipTxs });

          return borrowWithdrawObject;
        } else {
          // TODO: handle setErrorMessage
          console.error("No borrowWithdrawObject");
        }
      } catch (error) {
        // TODO: eccountered error,  handle setErrorMessage
        console.error("Error fetching borrowWithdrawObject");
      } finally {
        setLoadingState(false);
      }
    },
    [setActionTxns, setLoadingState]
  );

  const getSimulationResultCb = React.useCallback(
    async (amountArg: number) => {
      if (!marginfiClient || !account || !bank || !amountArg) {
        return;
      }

      const borrowWithdrawObject = await fetchBorrowWithdrawObject(bank, account, amountArg, actionMode);

      getSimulationResult({
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
    },
    [marginfiClient, account, bank, fetchBorrowWithdrawObject, actionMode, repayWithCollatOptions]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      console.log("debouncedAmount", debouncedAmount);
      console.log("prevDebouncedAmount", prevDebouncedAmount);
      getSimulationResultCb(debouncedAmount ?? 0);
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

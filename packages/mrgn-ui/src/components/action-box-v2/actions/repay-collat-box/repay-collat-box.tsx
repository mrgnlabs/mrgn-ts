import React from "react";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  ActiveBankInfo,
} from "@mrgnlabs/marginfi-v2-ui-state";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  PreviousTxn,
  usePriorityFee,
  ActionMessageType,
  showErrorToast,
  checkRepayCollatActionAvailable,
  MarginfiActionParams,
  ExecuteRepayWithCollatActionProps,
} from "@mrgnlabs/mrgn-utils";

import { CircularProgress } from "~/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";

import { handleExecuteRepayCollatAction } from "./utils";
import { Collateral, ActionInput, Preview } from "./components";
import { useRepayCollatBoxStore } from "./store";
import { useRepayCollatSimulation } from "./hooks";

import { useActionBoxStore } from "../../store";
import { useActionContext } from "../../contexts";

// error handling
export type RepayCollatBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const RepayCollatBox = ({
  nativeSolBalance,
  connected,
  // tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  isDialog,
  showAvailableCollateral,
  onComplete,
  captureEvent,
}: RepayCollatBoxProps) => {
  const [
    maxAmountCollateral,
    repayAmount,
    amountRaw,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    isLoading,
    simulationResult,
    actionTxns,
    refreshState,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    fetchActionBoxState,
    setAmountRaw,
    setSelectedBank,
    setSelectedSecondaryBank,
    setRepayAmount,
    setMaxAmountCollateral,
    setIsLoading,
    refreshSelectedBanks,
  ] = useRepayCollatBoxStore((state) => [
    state.maxAmountCollateral,
    state.repayAmount,
    state.amountRaw,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
    state.isLoading,
    state.simulationResult,
    state.actionTxns,
    state.refreshState,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,
    state.setRepayAmount,
    state.setMaxAmountCollateral,
    state.setIsLoading,
    state.refreshSelectedBanks,
  ]);

  const { priorityType, broadcastType, maxCap, maxCapType } = useActionContext();
  const priorityFees = usePriorityFee(
    priorityType,
    broadcastType,
    maxCapType,
    maxCap,
    marginfiClient?.provider.connection
  );

  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns.lastValidBlockHeight
  );

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode: ActionType.RepayCollat,
    maxAmountCollateral,
  });

  const { actionSummary } = useRepayCollatSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading,
    setMaxAmountCollateral,
  });

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedBank });
  }, [requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMessages([errorMessage]);
    }
  }, [errorMessage]);

  const actionMessages = React.useMemo(
    () =>
      checkRepayCollatActionAvailable({
        amount,
        connected,
        selectedBank,
        selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
      }),
    [amount, connected, selectedBank, selectedSecondaryBank, actionTxns.actionQuote]
  );

  const handleRepayCollatAction = React.useCallback(async () => {
    if (
      !selectedBank ||
      !amount ||
      !marginfiClient ||
      !selectedAccount ||
      !selectedSecondaryBank ||
      !actionTxns.actionQuote
    ) {
      return;
    }

    const action = async () => {
      const props: ExecuteRepayWithCollatActionProps = {
        marginfiClient,
        actionTxns,
        processOpts: {
          ...priorityFees,
          broadcastType,
        },
        txOpts: {},

        marginfiAccount: selectedAccount,
        borrowBank: selectedBank,
        withdrawAmount: amount,
        repayAmount,
        depositBank: selectedSecondaryBank,
        quote: actionTxns.actionQuote!,
        connection: marginfiClient.provider.connection,
      };

      await handleExecuteRepayCollatAction({
        props,
        captureEvent: (event, properties) => {
          captureEvent && captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs.pop() ?? "",
            txnType: "LEND",
            lendingOptions: {
              amount: amount,
              type: ActionType.RepayCollat,
              bank: selectedBank as ActiveBankInfo,
            },
          });

          onComplete &&
            onComplete({
              txn: txnSigs.pop() ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: amount,
                type: ActionType.RepayCollat,
                bank: selectedBank as ActiveBankInfo,
              },
            });
        },
        setIsError: () => {},
        setIsLoading: (isLoading) => setIsLoading(isLoading),
      });
    };

    await action();
    setAmountRaw("");
  }, [
    actionTxns,
    amount,
    broadcastType,
    captureEvent,
    marginfiClient,
    onComplete,
    priorityFees,
    repayAmount,
    selectedAccount,
    selectedBank,
    selectedSecondaryBank,
    setAmountRaw,
    setIsActionComplete,
    setIsLoading,
    setPreviousTxn,
  ]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <>
      {actionTxns.lastValidBlockHeight && blockProgress !== 0 && (
        <div className="absolute top-5 right-4 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CircularProgress
                  size={18}
                  strokeWidth={3}
                  value={blockProgress * 100}
                  strokeColor="stroke-mfi-action-box-accent-foreground"
                  backgroundColor="stroke-mfi-action-box-background-dark"
                />
              </TooltipTrigger>
              <TooltipContent side="left">
                <div className="space-y-2">
                  <p>Your transaction is ready for execution.</p>
                  <p>Once the spinner reaches 100%, if not processed, it will refresh to fetch updated quotes.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <div className="mb-6">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          repayAmount={repayAmount}
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
          setSelectedSecondaryBank={(bank) => {
            setSelectedSecondaryBank(bank);
          }}
        />
      </div>

      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage _actionMessage={actionMessage} />
            </div>
          )
      )}

      {showAvailableCollateral && (
        <div className="mb-6">
          <Collateral selectedAccount={selectedAccount} actionSummary={actionSummary} />
        </div>
      )}

      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length
          }
          connected={connected}
          handleAction={() => {
            handleRepayCollatAction();
          }}
          buttonLabel={"Repay"}
        />
      </div>

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </>
  );
};
function checkRepayColatActionAvailable(arg0: {
  amount: number;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionQuote: import("@jup-ag/api").QuoteResponse | null;
}): any {
  throw new Error("Function not implemented.");
}

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
  ActionMessageType,
  showErrorToast,
  checkRepayCollatActionAvailable,
  ExecuteRepayWithCollatActionProps,
  ActionTxns,
  MultiStepToastHandle,
  IndividualFlowError,
} from "@mrgnlabs/mrgn-utils";
import { IconInfoCircle } from "@tabler/icons-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionButton, ActionCollateralProgressBar } from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage, useActionContext } from "~/components";
import { IconLoader } from "~/components/ui/icons";
import { ActionSimulationStatus } from "../../components";
import { useRepayBoxStore } from "./store";
import { SimulationStatus } from "../../utils";
import { useActionBoxStore } from "../../store";
import { useRepaySimulation } from "./hooks";
import { CircularProgress } from "~/components/ui/circular-progress";
import { ActionInput, Preview } from "./components";

export type RepayBoxProps = {
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedDepositBank?: ExtendedBankInfo;
  requestedBorrowBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;

  showAvailableCollateral?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const RepayBox = ({
  nativeSolBalance,
  connected,
  marginfiClient,
  selectedAccount,
  banks,
  requestedDepositBank,
  requestedBorrowBank,
  accountSummaryArg,
  isDialog,
  showAvailableCollateral,
  onComplete,
  captureEvent,
}: RepayBoxProps) => {
  const [
    amountRaw,
    repayAmount,
    selectedDepositBank,
    selectedBorrowBank,
    simulationResult,
    actionTxns,
    errorMessage,

    maxAmountCollateral,

    refreshState,
    refreshSelectedBanks,
    fetchActionBoxState,
    setAmountRaw,
    setRepayAmount,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setSelectedDepositBank,
    setSelectedBorrowBank,

    setMaxAmountCollateral,
  ] = useRepayBoxStore((state) => [
    state.amountRaw,
    state.repayAmount,
    state.selectedDepositBank,
    state.selectedBorrowBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,

    state.maxAmountCollateral,

    state.refreshState,
    state.refreshSelectedBanks,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setRepayAmount,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setSelectedDepositBank,
    state.setSelectedBorrowBank,

    state.setMaxAmountCollateral,
  ]);

  const [isTransactionExecuting, setIsTransactionExecuting] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState<{
    isLoading: boolean;
    status: SimulationStatus;
  }>({
    isLoading: false,
    status: SimulationStatus.IDLE,
  });

  const isLoading = React.useMemo(
    () => isTransactionExecuting || isSimulating.isLoading,
    [isTransactionExecuting, isSimulating.isLoading]
  );

  const { broadcastType, priorityFees } = useActionContext() || { broadcastType: null, priorityFees: null };

  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns?.lastValidBlockHeight
  );

  const [setPreviousTxn, setIsActionComplete, platformFeeBps, slippageBps] = useActionBoxStore((state) => [
    state.setPreviousTxn,
    state.setIsActionComplete,
    state.platformFeeBps,
    state.slippageBps,
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
    selectedBank: selectedDepositBank,
    nativeSolBalance,
    actionMode: ActionType.Repay,
    maxAmountCollateral,
  });

  const { actionSummary, refreshSimulation } = useRepaySimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedDepositBank,
    selectedBorrowBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,

    platformFeeBps,
    slippageBps,

    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading: setIsSimulating,
    setMaxAmountCollateral,
  });

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  React.useEffect(() => {
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({
        actionTxn: null,
        additionalTxns: [],
        actionQuote: null,
      });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  // TODO: Do we need all these useEffects?
  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedDepositBank: requestedDepositBank, requestedBorrowBank: requestedBorrowBank });
  }, [requestedDepositBank, requestedBorrowBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  const actionMessages = React.useMemo(() => {
    return checkRepayCollatActionAvailable({
      amount,
      connected,
      selectedBank: selectedDepositBank,
      selectedSecondaryBank: selectedBorrowBank,
      actionQuote: actionTxns.actionQuote,
    });
  }, [amount, connected, selectedDepositBank, selectedBorrowBank, actionTxns.actionQuote]);

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
                  strokeColor="stroke-mfi-action-box-accent-foreground/50"
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
      <div className="mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                Repay <IconInfoCircle className="w-4 h-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Repay using your prefered token.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          amount={amount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          repayAmount={repayAmount}
          selectedBank={selectedDepositBank}
          selectedSecondaryBank={selectedBorrowBank}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedDepositBank}
          setSelectedSecondaryBank={setSelectedBorrowBank}
        />
      </div>

      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage
                _actionMessage={actionMessage}
                retry={refreshSimulation}
                isRetrying={isSimulating.isLoading}
              />
            </div>
          )
      )}

      {showAvailableCollateral && (
        <div className="mb-6">
          <ActionCollateralProgressBar selectedAccount={selectedAccount} actionSummary={actionSummary} />
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
            //   handleRepayCollatAction();
          }}
          buttonLabel={"Repay"} // TODO: change to "title or smt"
        />
      </div>

      <ActionSimulationStatus
        simulationStatus={isSimulating.status}
        hasErrorMessages={additionalActionMessages.length > 0}
        isActive={selectedDepositBank && amount > 0 ? true : false}
      />

      <Preview actionSummary={actionSummary} selectedBank={selectedDepositBank} isLoading={isLoading} />
    </>
  );
};

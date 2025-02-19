import React from "react";
import { v4 as uuidv4 } from "uuid";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  PreviousTxn,
  ActionMessageType,
  showErrorToast,
  checkRepayActionAvailable,
  ExecuteRepayActionProps,
  ExecuteRepayAction,
} from "@mrgnlabs/mrgn-utils";

import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionCollateralProgressBar,
  ActionSettingsButton,
} from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";
import { CircularProgress } from "~/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { TooltipProvider } from "~/components/ui/tooltip";

import { ActionSimulationStatus } from "../../components";
import { useRepayBoxStore } from "./store";
import { SimulationStatus } from "../../utils";
import { useActionBoxStore } from "../../store";
import { useRepaySimulation } from "./hooks";
import { ActionInput, Preview } from "./components";
import { useActionContext } from "../../contexts";

export type RepayBoxProps = {
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  requestedSecondaryBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;

  showAvailableCollateral?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const RepayBox = ({
  nativeSolBalance,
  connected,
  marginfiClient,
  selectedAccount,
  banks,
  requestedBank,
  requestedSecondaryBank,
  accountSummaryArg,
  isDialog,
  showAvailableCollateral,
  onComplete,
  captureEvent,
  setDisplaySettings,
}: RepayBoxProps) => {
  const [
    amountRaw,
    repayAmount,
    selectedBank,
    selectedSecondaryBank,
    simulationResult,
    actionTxns,
    errorMessage,

    maxAmountCollateral,
    maxOverflowHit,

    refreshState,
    refreshSelectedBanks,
    fetchActionBoxState,
    setAmountRaw,
    setRepayAmount,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setSelectedBank,
    setSelectedSecondaryBank,

    setMaxAmountCollateral,
    setMaxOverflowHit,
  ] = useRepayBoxStore((state) => [
    state.amountRaw,
    state.repayAmount,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,

    state.maxAmountCollateral,
    state.maxOverflowHit,
    state.refreshState,
    state.refreshSelectedBanks,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setRepayAmount,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,

    state.setMaxAmountCollateral,
    state.setMaxOverflowHit,
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

  const { transactionSettings, priorityFees, jupiterOptions } = useActionContext() || {
    transactionSettings: null,
    priorityFees: null,
    jupiterOptions: null,
  };
  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns?.lastValidBlockHeight
  );

  const [ platformFeeBps] = useActionBoxStore((state) => [
    state.platformFeeBps,
  ]);

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const actionMode = React.useMemo(() => {
    return selectedBank?.address.toBase58() !== selectedSecondaryBank?.address.toBase58()
      ? ActionType.RepayCollat
      : ActionType.Repay;
  }, [selectedBank, selectedSecondaryBank]);

  const buttonLabel = React.useMemo(() => {
    return selectedBank?.address.toBase58() !== selectedSecondaryBank?.address.toBase58()
      ? `Repay with ${selectedSecondaryBank?.meta.tokenSymbol}`
      : "Repay";
  }, [selectedBank, selectedSecondaryBank]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank: selectedBank,
    nativeSolBalance,
    actionMode,
    maxAmountCollateral,
  });

  const { actionSummary, refreshSimulation } = useRepaySimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,
    platformFeeBps,
    jupiterOptions,

    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading: setIsSimulating,
    setMaxAmountCollateral,
    setMaxOverflowHit,
  });

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  React.useEffect(() => {
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({
        transactions: [],
        actionQuote: null,
      });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  // Only set the action box state on mount
  React.useEffect(() => {
    fetchActionBoxState({ requestedBank: requestedBank, requestedSecondaryBank: requestedSecondaryBank });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  const actionMessages = React.useMemo(() => {
    return checkRepayActionAvailable({
      amount,
      connected,
      selectedBank,
      selectedSecondaryBank,
      actionQuote: actionTxns?.actionQuote ?? null,
      maxOverflowHit,
    });
  }, [amount, connected, selectedBank, selectedSecondaryBank, actionTxns.actionQuote, maxOverflowHit]);

  //////////////////
  // Repay Action //
  //////////////////

  const handleRepayAction = React.useCallback(async () => {
    if (
          !marginfiClient ||
          !selectedAccount ||
          !marginfiClient.provider.connection ||
          !transactionSettings ||
          !selectedBank ||
          !selectedSecondaryBank
        ) {
          return;
        }

    const params: ExecuteRepayActionProps = {
      actionTxns,
      attemptUuid: uuidv4(),
      marginfiClient,
      processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
      txOpts: {},
      callbacks: {
            captureEvent: captureEvent,
          },
          actionType: actionMode,
          infoProps: {
            borrowAmount: repayAmount.toString(),
            borrowToken: selectedBank.meta.tokenSymbol,
            depositAmount: amount.toString(),
            depositToken: selectedSecondaryBank.meta.tokenSymbol,
          } // TODO: check if these are correct
        }

    ExecuteRepayAction(params);

    setAmountRaw("");
  }, [actionMode, actionTxns, amount, captureEvent, marginfiClient, priorityFees, repayAmount, selectedAccount, selectedBank, selectedSecondaryBank, setAmountRaw, transactionSettings]);

  return (
    <ActionBoxContentWrapper>
      {actionTxns.lastValidBlockHeight && blockProgress !== 0 && (
        <div className="mb-6">
          <div className="absolute top-0 right-0 z-50">
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
        </div>
      )}
      <div>
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          amount={amount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          repayAmount={repayAmount}
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
          setSelectedSecondaryBank={setSelectedSecondaryBank}
          maxAmountCollateral={maxAmountCollateral}
          actionMethod={actionMode}
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
            handleRepayAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={isSimulating.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedBank && amount > 0 ? true : false}
        />
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </ActionBoxContentWrapper>
  );
};

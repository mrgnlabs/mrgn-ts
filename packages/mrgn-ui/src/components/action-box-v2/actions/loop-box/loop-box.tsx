import React from "react";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  ActiveBankInfo,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  checkLoopActionAvailable,
  ExecuteLoopingActionProps,
  MarginfiActionParams,
  PreviousTxn,
  showErrorToast,
  usePriorityFee,
} from "@mrgnlabs/mrgn-utils";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { WalletContextStateOverride } from "~/components/wallet-v2";
import { CircularProgress } from "~/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";

import { useActionBoxStore } from "../../store";

import { handleExecuteLoopAction } from "./utils";
import { ActionInput, Preview } from "./components";
import { useLoopBoxStore } from "./store";
import { useLoopSimulation } from "./hooks";
import { LeverageSlider } from "./components/leverage-slider";
import { ApyStat } from "./components/apy-stat";
import { useActionContext } from "../../contexts";

// error handling
export type LoopBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;

  isDialog?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const LoopBox = ({
  nativeSolBalance,
  connected,
  // tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  isDialog,
  onComplete,
  captureEvent,
}: LoopBoxProps) => {
  const [
    leverage,
    maxLeverage,
    amountRaw,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    isLoading,
    simulationResult,
    actionTxns,
    depositLstApy,
    borrowLstApy,
    refreshState,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    fetchActionBoxState,
    setAmountRaw,
    setSelectedBank,
    setSelectedSecondaryBank,
    setMaxLeverage,
    setLeverage,
    setIsLoading,
    refreshSelectedBanks,
  ] = useLoopBoxStore((state) => [
    state.leverage,
    state.maxLeverage,
    state.amountRaw,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
    state.isLoading,
    state.simulationResult,
    state.actionTxns,
    state.depositLstApy,
    state.borrowLstApy,
    state.refreshState,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,
    state.setMaxLeverage,
    state.setLeverage,
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

  const [slippage, setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.slippageBps,
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns.lastValidBlockHeight
  );

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
    actionMode: ActionType.Loop,
  });

  const debouncedLeverage = useAmountDebounce<number | null>(leverage, 1000);

  const { actionSummary } = useLoopSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    debouncedLeverage: debouncedLeverage ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,
    setMaxLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading,
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
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  const actionMessages = React.useMemo(
    () =>
      checkLoopActionAvailable({
        amount,
        connected,
        selectedBank,
        selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
      }),
    [amount, connected, selectedBank, selectedSecondaryBank, actionTxns.actionQuote]
  );

  const handleLoopAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient || !selectedSecondaryBank) {
      return;
    }

    const action = async () => {
      const props: ExecuteLoopingActionProps = {
        marginfiClient,
        actionTxns,
        processOpts: {
          ...priorityFees,
          broadcastType,
        },
        txOpts: {},

        marginfiAccount: selectedAccount,
        depositAmount: amount,
        borrowAmount: actionTxns.borrowAmount,
        actualDepositAmount: actionTxns.actualDepositAmount,
        depositBank: selectedBank,
        borrowBank: selectedSecondaryBank,
        quote: actionTxns.actionQuote!,
        connection: marginfiClient.provider.connection,
      };

      await handleExecuteLoopAction({
        props,
        captureEvent: (event, properties) => {
          captureEvent && captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs.pop() ?? "",
            txnType: "LOOP",
            loopOptions: {
              depositBank: selectedBank as ActiveBankInfo,
              borrowBank: selectedSecondaryBank as ActiveBankInfo,
              depositAmount: actionTxns.actualDepositAmount,
              borrowAmount: actionTxns.borrowAmount.toNumber(),
              leverage: leverage,
            },
          });

          onComplete &&
            onComplete({
              txn: txnSigs.pop() ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: amount,
                type: ActionType.Loop,
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
    leverage,
    marginfiClient,
    onComplete,
    priorityFees,
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
                <CircularProgress size={18} strokeWidth={3} value={blockProgress * 100} />
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
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
          setSelectedSecondaryBank={(bank) => {
            setSelectedSecondaryBank(bank);
          }}
          isLoading={isLoading}
          walletAmount={walletAmount}
          actionTxns={actionTxns}
        />
      </div>

      <div className="px-1 space-y-6 mb-4">
        <LeverageSlider
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          amountRaw={amountRaw}
          leverageAmount={leverage}
          maxLeverage={maxLeverage}
          setLeverageAmount={setLeverage}
        />

        <ApyStat
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          leverageAmount={leverage}
          depositLstApy={depositLstApy}
          borrowLstApy={borrowLstApy}
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

      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length
          }
          connected={connected}
          handleAction={() => {
            handleLoopAction();
          }}
          loaderType="INFINITE"
          buttonLabel={"Loop"}
        />
      </div>

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </>
  );
};

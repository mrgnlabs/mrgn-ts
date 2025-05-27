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
  ActionMessageType,
  checkDepositSwapActionAvailable,
  usePrevious,
  ExecuteDepositSwapAction,
  logActivity,
} from "@mrgnlabs/mrgn-utils";
import { dynamicNumeralFormatter, nativeToUi, WalletToken } from "@mrgnlabs/mrgn-common";

import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionCollateralProgressBar,
  ActionSettingsButton,
  ActionSimulationStatus,
} from "~/components/action-box-v2/components";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import { useActionContext, HidePoolStats } from "~/components/action-box-v2/contexts";
import { ActionMessage } from "~/components/action-message";

import { useDepositSwapActionAmounts, useDepositSwapSimulation } from "./hooks";
import { getBankByPk, getBankOrWalletTokenByPk } from "./utils";
import { useDepositSwapBoxStore } from "./store";
import { ActionInput, Preview } from "./components";

export type DepositSwapBoxProps = {
  nativeSolBalance: number;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedDepositBank?: ExtendedBankInfo;
  requestedSwapBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;
  showTokenSelection?: boolean;
  showTokenSelectionGroups?: boolean;
  hidePoolStats?: HidePoolStats;
  displaySettings?: boolean;

  walletTokens: WalletToken[] | null;
  allBanks?: ExtendedBankInfo[];

  onComplete?: (infoProps: { walletToken?: WalletToken }) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const DepositSwapBox = ({
  nativeSolBalance,
  connected,
  marginfiClient,
  banks,
  selectedAccount,
  accountSummaryArg,
  isDialog,
  showTokenSelection,
  showAvailableCollateral = true,
  showTokenSelectionGroups,
  requestedDepositBank,
  requestedSwapBank,
  onComplete,
  captureEvent,
  hidePoolStats,
  walletTokens,
  allBanks,
  displaySettings,
  setDisplaySettings,
}: DepositSwapBoxProps) => {
  const [
    amountRaw,
    lendMode,
    actionTxns,
    simulationResult,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setAmountRaw,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,

    setSelectedDepositBankPk,
    setSelectedSwapBankPk,

    selectedDepositBankPk,
    selectedSwapBankPk,
  ] = useDepositSwapBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.simulationResult,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,

    state.setSelectedDepositBankPk,
    state.setSelectedSwapBankPk,

    state.selectedDepositBankPk,
    state.selectedSwapBankPk,
  ]);

  const selectedDepositBank = React.useMemo(() => {
    return getBankByPk(banks, selectedDepositBankPk);
  }, [banks, selectedDepositBankPk]);

  const selectedSwapBank = React.useMemo(() => {
    return getBankOrWalletTokenByPk(banks, walletTokens, selectedSwapBankPk);
  }, [banks, walletTokens, selectedSwapBankPk]);

  const [simulationStatus, setSimulationStatus] = React.useState<{
    isLoading: boolean;
    status: SimulationStatus;
  }>({
    isLoading: false,
    status: SimulationStatus.IDLE,
  });

  const { transactionSettings, priorityFees, jupiterOptions } = useActionContext() || {
    transactionSettings: null,
    priorityFees: null,
    jupiterOptions: null,
  };

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const isDust = React.useMemo(
    () => selectedDepositBank?.isActive && selectedDepositBank?.position.isDust,
    [selectedDepositBank]
  );
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const { amount, debouncedAmount, walletAmount, maxAmount } = useDepositSwapActionAmounts({
    amountRaw,
    selectedBank: selectedSwapBank ?? selectedDepositBank,
    nativeSolBalance,
    actionMode: lendMode,
    walletTokens,
  });
  const actionMessages = React.useMemo(() => {
    return checkDepositSwapActionAvailable({
      amount,
      connected,
      showCloseBalance,
      depositBank: selectedDepositBank,
      swapBank: selectedSwapBank,
      banks,
      marginfiAccount: selectedAccount,
      nativeSolBalance,
      lendMode,
      allBanks,
    });
  }, [
    amount,
    connected,
    showCloseBalance,
    selectedDepositBank,
    selectedSwapBank,
    banks,
    selectedAccount,
    nativeSolBalance,
    lendMode,
    allBanks,
  ]);

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  const { actionSummary, refreshSimulation } = useDepositSwapSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    accountSummary,
    depositBank: selectedDepositBank ?? null,
    swapBank: selectedSwapBank ?? null,
    actionTxns,
    simulationResult,
    jupiterOptions,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setSimulationStatus,
    marginfiClient,
    isDisabled: actionMessages.some((message) => !message.isEnabled),
  });

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState(lendMode);
    }
  }, [refreshState, connected, lendMode]);

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  //clean state
  React.useEffect(() => {
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({ transactions: [], actionQuote: null });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  React.useEffect(() => {
    fetchActionBoxState({
      requestedLendType: ActionType.Deposit,
      depositBank: requestedDepositBank,
      swapBank: requestedSwapBank,
    });
  }, [requestedDepositBank, requestedSwapBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : lendMode), [showCloseBalance, lendMode]);

  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBankPk = usePrevious(selectedDepositBankPk);
  const prevSwapBankPk = usePrevious(selectedSwapBankPk);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBankPk &&
      prevSwapBankPk &&
      prevAmount &&
      (prevSelectedBankPk !== selectedDepositBankPk || prevSwapBankPk !== selectedSwapBankPk || prevAmount !== amount)
    ) {
      setErrorMessage(null);
      setActionTxns({ transactions: [], actionQuote: null });
      setSimulationResult(null);
    }
  }, [
    prevSelectedBankPk,
    prevSwapBankPk,
    prevAmount,
    selectedDepositBankPk,
    selectedSwapBankPk,
    amount,
    setErrorMessage,
    setActionTxns,
    setSimulationResult,
  ]);

  const handleDepositSwapAction = React.useCallback(() => {
    if (!actionTxns || !marginfiClient || !debouncedAmount || debouncedAmount === 0 || !transactionSettings) {
      console.error("Missing required props for ExecuteDepositSwapAction");
      return;
    }

    const depositAmount = !!actionTxns.actionQuote
      ? dynamicNumeralFormatter(
          Number(
            nativeToUi(Number(actionTxns.actionQuote?.outAmount), selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
          )
        )
      : dynamicNumeralFormatter(debouncedAmount ?? 0);

    let swapTokenSymbol = "";
    let swapTokenMint = "";
    let swapTokenImage = "";

    if (selectedSwapBank && "info" in selectedSwapBank) {
      swapTokenSymbol = selectedSwapBank.meta.tokenSymbol;
      swapTokenMint = selectedSwapBank.info.rawBank.mint.toBase58();
      swapTokenImage = selectedSwapBank.meta.tokenLogoUri;
    } else if (selectedSwapBank) {
      swapTokenSymbol = selectedSwapBank.symbol;
      swapTokenMint = selectedSwapBank.address.toBase58();
      swapTokenImage = selectedSwapBank.logoUri;
    }

    const props = {
      actionTxns,
      attemptUuid: uuidv4(),
      marginfiClient,
      processOpts: {
        ...priorityFees,
        broadcastType: transactionSettings.broadcastType,
      },
      txOpts: {},
      callbacks: {
        captureEvent: captureEvent,
        onComplete: (txnSig: string) => {
          onComplete?.({
            walletToken: selectedSwapBank && "info" in selectedSwapBank ? undefined : (selectedSwapBank ?? undefined),
          });
          // Log the activity
          const activityDetails: Record<string, any> = {
            amount: depositAmount,
            symbol: selectedDepositBank?.meta.tokenSymbol,
            mint: selectedDepositBank?.info.rawBank.mint.toBase58(),
            secondaryAmount: amount,
            secondarySymbol: swapTokenSymbol,
            secondaryMint: swapTokenMint,
            secondaryImage: swapTokenImage,
          };

          logActivity(ActionType.Deposit, txnSig, activityDetails, selectedAccount?.address).catch((error) => {
            console.error("Failed to log activity:", error);
          });
        },
      },
      infoProps: {
        depositToken: selectedDepositBank?.meta.tokenSymbol ?? "",
        swapToken: swapTokenSymbol,
        depositAmount,
        swapAmount: dynamicNumeralFormatter(debouncedAmount ?? 0),
      },
    };

    ExecuteDepositSwapAction(props);
    setAmountRaw("");
  }, [
    actionTxns,
    marginfiClient,
    priorityFees,
    transactionSettings,
    captureEvent,
    selectedDepositBank,
    selectedSwapBank,
    debouncedAmount,
    setAmountRaw,
    onComplete,
    amount,
    selectedAccount,
  ]);

  return (
    <ActionBoxContentWrapper>
      <div className="space-y-1 mb-4">
        <span className="text-sm text-muted-foreground">
          {!requestedDepositBank ||
          (selectedDepositBank &&
            selectedSwapBank &&
            selectedDepositBank.meta.tokenSymbol ===
              ("info" in selectedSwapBank ? selectedSwapBank.info.state.mint.toBase58() : selectedSwapBank.symbol))
            ? "Swap"
            : "Swap & Deposit"}
        </span>
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
          amountRaw={amountRaw}
          amount={debouncedAmount}
          maxAmount={maxAmount}
          connected={connected}
          selectedBank={selectedSwapBank ?? selectedDepositBank ?? null}
          lendMode={lendMode}
          isDialog={isDialog}
          showTokenSelection={showTokenSelection}
          showTokenSelectionGroups={showTokenSelectionGroups}
          setAmountRaw={setAmountRaw}
          setSelectedBank={(bank) => {
            const bankPk = bank?.address;
            if (!bankPk) {
              setSelectedSwapBankPk(null);
              return;
            }

            if (selectedDepositBankPk?.equals(bankPk) && !requestedSwapBank) {
              setSelectedSwapBankPk(bankPk);
              setSelectedDepositBankPk(null);
            } else {
              setSelectedSwapBankPk(bankPk);
            }
          }}
          walletTokens={walletTokens}
          showOnlyUserOwnedTokens={true}
        />
      </div>

      {!requestedDepositBank && (
        <div className="space-y-1 mb-4">
          <p className="text-sm text-muted-foreground">Deposit</p>
          <ActionInput
            banks={banks.filter(
              (bank) =>
                bank.info.rawBank.mint.toBase58() !==
                (selectedSwapBank && "info" in selectedSwapBank
                  ? selectedSwapBank?.info.rawBank.mint.toBase58()
                  : selectedSwapBank?.address.toBase58())
            )}
            nativeSolBalance={nativeSolBalance}
            walletAmount={walletAmount}
            amountRaw={
              isNaN(Number(actionTxns?.actionQuote?.outAmount))
                ? ""
                : nativeToUi(
                    Number(actionTxns?.actionQuote?.outAmount),
                    selectedDepositBank?.info.rawBank.mintDecimals ?? 9
                  ).toString()
            } // clean
            amount={
              isNaN(Number(actionTxns?.actionQuote?.outAmount))
                ? 0
                : nativeToUi(
                    Number(actionTxns?.actionQuote?.outAmount),
                    selectedDepositBank?.info.rawBank.mintDecimals ?? 9
                  )
            } // clean
            maxAmount={maxAmount}
            connected={connected}
            selectedBank={selectedDepositBank ?? null}
            lendMode={lendMode}
            isDialog={isDialog}
            showTokenSelection={showTokenSelection}
            showTokenSelectionGroups={showTokenSelectionGroups}
            setAmountRaw={setAmountRaw}
            setSelectedBank={(bank) => {
              const bankPk = bank?.address;
              if (!bankPk) {
                setSelectedDepositBankPk(null);
                return;
              }

              if (selectedSwapBankPk?.equals(bankPk) && !requestedDepositBank) {
                setSelectedDepositBankPk(bankPk);
                setSelectedSwapBankPk(null);
              } else {
                setSelectedDepositBankPk(bankPk);
              }
            }}
            isInputDisabled={true}
            showOnlyUserOwnedTokens={false}
          />
        </div>
      )}

      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage
                actionMessage={actionMessage}
                retry={refreshSimulation}
                isRetrying={simulationStatus.isLoading}
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
          isLoading={simulationStatus.isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length &&
            actionTxns?.transactions.length > 0
          }
          connected={connected}
          handleAction={() => {
            handleDepositSwapAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={simulationStatus.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedDepositBank && amount > 0 ? true : false}
        />
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      <Preview
        actionSummary={actionSummary}
        selectedBank={selectedDepositBank}
        isLoading={simulationStatus.isLoading}
        lendMode={lendMode}
        hidePoolStats={hidePoolStats}
      />

      <LSTDialog
        variant={selectedDepositBank?.meta.tokenSymbol as LSTDialogVariants}
        open={!!lstDialogCallback}
        onClose={() => {
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
        banks={banks}
      />
    </ActionBoxContentWrapper>
  );
};

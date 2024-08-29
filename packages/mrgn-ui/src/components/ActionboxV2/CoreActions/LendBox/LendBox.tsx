import React from "react";

import { WalletContextState } from "@solana/wallet-adapter-react";

import {
  ActiveBankInfo,
  ExtendedBankInfo,
  ActionType,
  TokenAccountMap,
  AccountSummary,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, MarginfiActionParams, PreviousTxn, WalletContextStateOverride } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { ActionBoxActions, ActionMessage, ActionSettingsButton } from "~/components/ActionboxV2/sharedComponents";
import { useActionBoxStore } from "~/components/ActionboxV2/store";
import { useActionAmounts } from "~/components/ActionboxV2/sharedHooks";

import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";

import { useLendBoxStore } from "./store";
import { checkActionAvailable, handleExecuteCloseBalance, handleExecuteLendingAction } from "./utils";
import { LendBoxCollateral, LendBoxInput, LendBoxPreview } from "./components";
import { useLendSimulation } from "./hooks";

// error handling
export type LendBoxProps = {
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedLendType: ActionType;
  requestedBank?: ExtendedBankInfo;
  accountSummary?: AccountSummary;

  isDialog?: boolean;

  onConnect?: () => void;
  onComplete: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const LendBox = ({
  nativeSolBalance,
  tokenAccountMap,
  walletContextState,
  connected,
  banks,
  selectedAccount,
  accountSummary,
  requestedLendType,
  requestedBank,
  isDialog,
  onConnect,
  onComplete,
  captureEvent,
}: LendBoxProps) => {
  const priorityFee = 0;

  const [
    amountRaw,
    lendMode,
    selectedBank,
    simulationResult,
    isLoading,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setIsLoading,
    setAmountRaw,
    refreshSelectedBanks,
    setSimulationResult,
  ] = useLendBoxStore((state) => [
    state.amountRaw,
    state.lendMode,
    state.selectedBank,
    state.simulationResult,
    state.isLoading,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setIsLoading,
    state.setAmountRaw,
    state.refreshSelectedBanks,
    state.setSimulationResult,
  ]);

  const [setIsSettingsDialogOpen] = useActionBoxStore((state) => [state.setIsSettingsDialogOpen]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode: lendMode,
  });
  const { actionSummary } = useLendSimulation(debouncedAmount ?? 0, selectedAccount, accountSummary);

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState(lendMode);
    }
  }, [refreshState, connected, lendMode]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType, requestedBank });
  }, [requestedLendType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage !== null && errorMessage.description) {
      setAdditionalActionMethods([errorMessage]);
    }
  }, [errorMessage]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const actionMethods = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        connected,
        showCloseBalance,
        selectedBank,
        banks,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        lendMode,
      }),
    [amount, connected, showCloseBalance, selectedBank, banks, selectedAccount, nativeSolBalance, lendMode]
  );

  const handleCloseBalance = React.useCallback(async () => {
    if (!selectedBank || !selectedAccount) {
      return;
    }

    await handleExecuteCloseBalance({
      params: {
        bank: selectedBank,
        marginfiAccount: selectedAccount,
        priorityFee,
      },
      captureEvent: (event, properties) => {
        captureEvent && captureEvent(event, properties);
      },
      setIsComplete: (txnSigs) => {
        onComplete({
          txn: txnSigs.pop() ?? "",
          txnType: "LEND",
          lendingOptions: {
            amount: 0,
            type: ActionType.Withdraw,
            bank: selectedBank as ActiveBankInfo,
          },
        });
      },
      setIsError: () => {},
      setIsLoading: (isLoading) => setIsLoading(isLoading),
    });

    setAmountRaw("");
  }, [selectedBank, selectedAccount, setAmountRaw, captureEvent, onComplete, setIsLoading]);

  const handleLendingAction = React.useCallback(async () => {
    if (!selectedBank || !amount) {
      return;
    }

    const action = async () => {
      const params = {
        mfiClient: null,
        actionType: lendMode,
        bank: selectedBank,
        amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      } as MarginfiActionParams;

      await handleExecuteLendingAction({
        params,
        captureEvent: (event, properties) => {
          captureEvent && captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          onComplete({
            txn: txnSigs.pop() ?? "",
            txnType: "LEND",
            lendingOptions: {
              amount: amount,
              type: lendMode,
              bank: selectedBank as ActiveBankInfo,
            },
          });
        },
        setIsError: () => {},
        setIsLoading: (isLoading) => setIsLoading(isLoading),
      });
    };

    if (
      lendMode === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL")
    ) {
      setLSTDialogCallback(() => action);
      return;
    }

    await action();
    setAmountRaw("");
  }, [
    selectedBank,
    amount,
    lendMode,
    setAmountRaw,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
    captureEvent,
    onComplete,
    setIsLoading,
  ]);

  return (
    <>
      <LendBoxInput
        banks={banks}
        nativeSolBalance={nativeSolBalance}
        walletAmount={walletAmount}
        amountRaw={amountRaw}
        maxAmount={maxAmount}
        connected={connected}
      />

      {additionalActionMethods.concat(actionMethods).map(
        (actionMethod, idx) =>
          actionMethod.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage actionMethod={actionMethod} />
            </div>
          )
      )}

      <LendBoxCollateral selectedAccount={selectedAccount} actionSummary={actionSummary} />

      <ActionBoxActions
        isLoading={isLoading}
        isEnabled={!additionalActionMethods.concat(actionMethods).filter((value) => value.isEnabled === false).length}
        connected={connected}
        // showCloseBalance={showCloseBalance}
        handleAction={() => {
          showCloseBalance ? handleCloseBalance() : handleLendingAction();
        }}
        handleConnect={() => onConnect && onConnect()}
        buttonLabel={""}
      />

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

      <LendBoxPreview actionSummary={actionSummary} />

      <LSTDialog
        variant={selectedBank?.meta.tokenSymbol as LSTDialogVariants}
        open={!!lstDialogCallback}
        onClose={() => {
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
        banks={banks}
      />
    </>
  );
};

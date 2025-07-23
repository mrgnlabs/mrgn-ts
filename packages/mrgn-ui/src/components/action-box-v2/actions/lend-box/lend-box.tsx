import React from "react";
import { v4 as uuidv4 } from "uuid";

import Link from "next/link";

import { WalletContextState } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import {
  addTransactionMetadata,
  dynamicNumeralFormatter,
  TransactionType,
  percentFormatter,
} from "@mrgnlabs/mrgn-common";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  getEmodePairs,
} from "@mrgnlabs/mrgn-state";

import {
  ActionEmodeImpact,
  EmodeImpact,
  MarginfiAccountWrapper,
  MarginfiClient,
  vendor,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  checkLendActionAvailable,
  ExecuteLendingActionProps,
  executeLendingAction,
  usePrevious,
  useIsMobile,
  LendSelectionGroups,
  composeExplorerUrl,
  executeActionWrapper,
  logActivity,
} from "@mrgnlabs/mrgn-utils";

import { ActionBoxContentWrapper, ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { WalletContextStateOverride } from "~/components/wallet-v2";
import { ActionMessage, SVSPMEV } from "~/components";

import { useLendBoxStore } from "./store";
import { ActionSimulationStatus } from "../../components";
import { Collateral, ActionInput, Preview, StakeAccountSwitcher } from "./components";
import { SimulationStatus } from "../../utils";
import { useLendSimulation } from "./hooks";
import { HidePoolStats, useActionBoxContext } from "../../contexts/actionbox/actionbox.context";
import { useActionContext } from "../../contexts";

// error handling
export type LendBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;
  banks?: ExtendedBankInfo[];

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  requestedLendType: ActionType;
  requestedBank?: ExtendedBankInfo;
  initialAmount?: number;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;
  showTokenSelection?: boolean;
  selectionGroups?: LendSelectionGroups[];
  hidePoolStats?: HidePoolStats;

  onCloseDialog?: () => void;
  setShouldBeHidden?: (hidden: boolean) => void;

  onComplete?: (newAccountKey?: PublicKey) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const LendBox = ({
  nativeSolBalance,
  banks: banksProp,
  // tokenAccountMap,
  walletContextState,
  connected,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  isDialog,
  showTokenSelection,
  showAvailableCollateral = true,
  selectionGroups,
  requestedLendType,
  requestedBank,
  onComplete,
  captureEvent,
  hidePoolStats,
  setDisplaySettings,
  onCloseDialog,
  setShouldBeHidden,
  initialAmount,
}: LendBoxProps) => {
  const [
    amountRaw,
    lendMode,
    actionTxns,
    selectedBank,
    simulationResult,
    errorMessage,
    selectedStakeAccount,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setAmountRaw,
    setSelectedBank,
    refreshSelectedBanks,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setStakeAccounts,
    setSelectedStakeAccount,
  ] = useLendBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.selectedBank,
    state.simulationResult,
    state.errorMessage,
    state.selectedStakeAccount,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setAmountRaw,
    state.setSelectedBank,
    state.refreshSelectedBanks,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setStakeAccounts,
    state.setSelectedStakeAccount,
  ]);

  const isMobile = useIsMobile();

  const [isTransactionExecuting, setIsTransactionExecuting] = React.useState(false);
  const [simulationStatus, setSimulationStatus] = React.useState<{
    isLoading: boolean;
    status: SimulationStatus;
  }>({
    isLoading: false,
    status: SimulationStatus.IDLE,
  });

  const isLoading = React.useMemo(
    () => isTransactionExecuting || simulationStatus.isLoading,
    [isTransactionExecuting, simulationStatus.isLoading]
  );

  const { transactionSettings, priorityFees } = useActionContext() || { transactionSettings: null, priorityFees: null };

  const contextProps = useActionBoxContext();
  const banks = banksProp ?? contextProps?.banks;
  const lstRates = contextProps?.lstRates;
  const emissionsRates = contextProps?.emissionsRates;
  const stakeAccounts = contextProps?.stakeAccounts;
  const stakePoolMetadataMap = contextProps?.stakePoolMetadataMap;
  const stakePoolMetadata = stakePoolMetadataMap?.get(selectedBank?.address.toBase58() ?? "");
  const lstRate = lstRates?.get(selectedBank?.info.state.mint.toBase58() ?? "");

  const accountSummary = React.useMemo(() => {
    return accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount) : DEFAULT_ACCOUNT_SUMMARY);
  }, [accountSummaryArg, selectedAccount]);

  const actionEmodeImpact: ActionEmodeImpact | undefined = React.useMemo(() => {
    if (selectedBank && selectedAccount && banks) {
      const rawBanks = banks.map((bank) => bank.info.rawBank);
      const emodePairs = getEmodePairs(rawBanks);
      const emodeImpacts = selectedAccount.computeEmodeImpacts(emodePairs);
      const emodeImpact: ActionEmodeImpact | undefined = emodeImpacts[selectedBank.address.toBase58()];
      return emodeImpact;
    }
    return undefined;
  }, [banks, selectedBank, selectedAccount]);

  const emodeImpact = React.useMemo(() => {
    let impact: EmodeImpact | undefined;

    if (lendMode === ActionType.Deposit) {
      impact = actionEmodeImpact?.supplyImpact;
    } else if (lendMode === ActionType.Borrow) {
      impact = actionEmodeImpact?.borrowImpact;
    }

    return impact;
  }, [actionEmodeImpact?.borrowImpact, actionEmodeImpact?.supplyImpact, lendMode]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode: lendMode,
    selectedStakeAccount: selectedStakeAccount || undefined,
  });

  const { actionSummary, refreshSimulation } = useLendSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    accountSummary,
    selectedBank,
    lendMode,
    actionTxns,
    simulationResult,
    stakeOpts: stakePoolMetadata
      ? {
          stakeAccount: selectedStakeAccount?.address,
          stakePoolMetadata,
          stakeAmount: selectedStakeAccount?.balance,
          walletAmount: walletAmount,
        }
      : undefined,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setSimulationStatus,
    marginfiClient: marginfiClient,
  });

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

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
      setActionTxns({ transactions: [] });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType, requestedBank });
  }, [requestedLendType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (initialAmount !== undefined) {
      const finalAmount = Math.min(initialAmount, maxAmount);
      setAmountRaw(finalAmount.toString());
    }
  }, [initialAmount, setAmountRaw, maxAmount]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const actionMessages = React.useMemo(() => {
    if (!banks) return [];

    return checkLendActionAvailable({
      amount,
      connected,
      showCloseBalance,
      selectedBank,
      banks,
      marginfiAccount: selectedAccount,
      nativeSolBalance,
      lendMode,
      selectedStakeAccount,
    });
  }, [
    amount,
    connected,
    showCloseBalance,
    selectedBank,
    banks,
    selectedAccount,
    nativeSolBalance,
    lendMode,
    selectedStakeAccount,
  ]);

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : lendMode), [showCloseBalance, lendMode]);

  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBank = usePrevious(selectedBank);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBank &&
      prevAmount &&
      (prevSelectedBank.meta.tokenSymbol !== selectedBank?.meta.tokenSymbol || prevAmount !== amount)
    ) {
      setAdditionalActionMessages([]);
      setErrorMessage(null);
    }
  }, [prevSelectedBank, prevAmount, selectedBank, amount, setErrorMessage]);

  const handleLendingAction = React.useCallback(() => {
    if (!selectedBank || !amount || !transactionSettings || !marginfiClient) return;

    const props: ExecuteLendingActionProps = {
      actionTxns,
      attemptUuid: uuidv4(),
      marginfiClient,
      processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
      txOpts: {},
      callbacks: {
        captureEvent: captureEvent,
        onComplete: (txnSig: string, newAccountKey?: PublicKey) => {
          onComplete?.(newAccountKey);

          // Log the activity
          const activityDetails: Record<string, any> = {
            amount: amount,
            symbol: selectedBank.meta.tokenSymbol,
            mint: selectedBank.info.rawBank.mint.toBase58(),
          };

          logActivity(lendMode, txnSig, activityDetails, selectedAccount?.address).catch((error) => {
            console.error("Failed to log activity:", error);
          });
        },
      },
      infoProps: {
        amount: dynamicNumeralFormatter(amount),
        token: selectedBank.meta.tokenSymbol,
      },
      nativeSolBalance: nativeSolBalance,
      actionType: lendMode,
    };

    executeLendingAction(props);

    setAmountRaw("");
  }, [
    actionTxns,
    amount,
    captureEvent,
    lendMode,
    marginfiClient,
    nativeSolBalance,
    priorityFees,
    selectedBank,
    setAmountRaw,
    transactionSettings,
    onComplete,
    selectedAccount,
  ]);

  const hasErrorsWarnings = React.useMemo(() => {
    return additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length > 0;
  }, [additionalActionMessages, actionMessages]);

  // store users stake accounts in state on load
  // selected stake account will be handled in lend store
  React.useEffect(() => {
    if (stakeAccounts) {
      setStakeAccounts(stakeAccounts);
    }
  }, [stakeAccounts, setStakeAccounts]);

  // set selected stake account on load
  // if requestedBank is set
  React.useEffect(() => {
    if (requestedBank && stakeAccounts) {
      const stakePoolMetadata = stakePoolMetadataMap?.get(requestedBank.address.toBase58());
      const stakeAccount = stakeAccounts.find((stakeAccount) =>
        stakeAccount.validator.equals(stakePoolMetadata?.validatorVoteAccount || PublicKey.default)
      );
      if (stakeAccount) {
        setSelectedStakeAccount({
          address: stakeAccount.accounts[0].pubkey,
          balance: stakeAccount.accounts[0].amount,
        });
      }
    }
  }, [requestedBank, stakeAccounts, setSelectedStakeAccount, stakePoolMetadataMap]);

  // set selected stake account when selected bank changes
  React.useEffect(() => {
    if (selectedBank && stakeAccounts) {
      const stakePoolMetadata = stakePoolMetadataMap?.get(selectedBank.address.toBase58());
      const stakeAccount = stakeAccounts.find((stakeAccount) =>
        stakeAccount.validator.equals(stakePoolMetadata?.validatorVoteAccount || PublicKey.default)
      );
      if (stakeAccount) {
        setSelectedStakeAccount({
          address: stakeAccount.accounts[0].pubkey,
          balance: stakeAccount.accounts[0].amount,
        });
      }
    }
  }, [selectedBank, stakeAccounts, setSelectedStakeAccount, stakePoolMetadataMap]);

  React.useEffect(() => {
    if (marginfiClient && banks) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  React.useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (isMobile || event.key !== "Enter" || isLoading || !connected) {
        return;
      }

      const isActionEnabled = !additionalActionMessages
        .concat(actionMessages)
        .filter((value) => value.isEnabled === false).length;

      if (isActionEnabled) {
        await handleLendingAction();
      }
    };

    document.addEventListener("keypress", handleKeyPress);
    return () => document.removeEventListener("keypress", handleKeyPress);
  }, [isLoading, connected, additionalActionMessages, actionMessages, showCloseBalance, handleLendingAction, isMobile]);

  return (
    <ActionBoxContentWrapper>
      <div className="mb-4">
        <ActionInput
          banks={banks ?? []}
          lstRates={lstRates}
          emissionsRates={emissionsRates}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
          amountRaw={amountRaw}
          amount={debouncedAmount}
          maxAmount={maxAmount}
          connected={connected}
          selectedBank={selectedBank}
          lendMode={lendMode}
          isDialog={isDialog}
          showTokenSelection={showTokenSelection}
          selectionGroups={selectionGroups}
          selectedStakeAccount={selectedStakeAccount?.address}
          stakePoolMetadata={stakePoolMetadata}
          onStakeAccountChange={setSelectedStakeAccount}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
        />
      </div>

      {selectedBank && lendMode === ActionType.Withdraw && (
        <SVSPMEV
          className="hidden md:block mb-4"
          bank={selectedBank}
          stakePool={stakePoolMetadata}
          onClaim={async () => {
            if (!marginfiClient || !stakePoolMetadata?.validatorVoteAccount) return;

            const ix = await vendor.replenishPoolIx(stakePoolMetadata.validatorVoteAccount);
            const tx = addTransactionMetadata(new Transaction().add(ix), {
              type: TransactionType.INITIALIZE_STAKED_POOL,
            });

            await executeActionWrapper({
              actionName: "Replenish MEV rewards",
              steps: [{ label: "Signing transaction" }, { label: "Replenishing SVSP MEV" }],
              action: async (txns, onSuccessAndNext) => {
                const sigs = await marginfiClient.processTransactions(txns.transactions, {
                  broadcastType: "RPC",
                  ...priorityFees,
                  callback(index, success, sig, stepsToAdvance) {
                    success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
                  },
                });
                return sigs[0];
              },
              onComplete: () => {
                refreshState();
              },
              txns: {
                transactions: [tx],
              },
            });
          }}
        />
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
          <Collateral selectedAccount={selectedAccount} actionSummary={actionSummary} emodeImpact={emodeImpact} />
        </div>
      )}
      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length &&
            actionTxns?.transactions.length > 0
          }
          connected={connected}
          handleAction={() => {
            handleLendingAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>
      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={simulationStatus.status}
          hasErrorMessages={hasErrorsWarnings}
          isActive={selectedBank && amount > 0 ? true : false}
        />

        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      <Preview
        actionSummary={actionSummary}
        selectedBank={selectedBank}
        isLoading={isLoading}
        lendMode={lendMode}
        hidePoolStats={hidePoolStats}
        lstRate={lstRate}
        emissionRate={
          emissionsRates?.[selectedBank?.address.toBase58() ?? ""]?.annualized_rate_enhancement
            ? percentFormatter.format(
                emissionsRates?.[selectedBank?.address.toBase58() ?? ""]?.annualized_rate_enhancement
              )
            : undefined
        }
      />

      <LSTDialog
        variant={selectedBank?.meta.tokenSymbol as LSTDialogVariants}
        open={!!lstDialogCallback}
        onClose={() => {
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
        banks={banks ?? []}
      />
    </ActionBoxContentWrapper>
  );
};

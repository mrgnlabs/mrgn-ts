import React from "react";
import { v4 as uuidv4 } from "uuid";

import Link from "next/link";

import { WalletContextState } from "@solana/wallet-adapter-react";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  getStakePoolUnclaimedLamps,
} from "@mrgnlabs/marginfi-v2-ui-state";

import { AssetTag, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ValidatorStakeGroup } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  checkLendActionAvailable,
  ExecuteLendingActionProps,
  executeLendingAction,
  usePrevious,
  useIsMobile,
  LendSelectionGroups,
} from "@mrgnlabs/mrgn-utils";

import { ActionBoxContentWrapper, ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";

import { useLendBoxStore } from "./store";
import { ActionSimulationStatus } from "../../components";
import { Collateral, ActionInput, Preview, StakeAccountSwitcher } from "./components";
import { SimulationStatus } from "../../utils";
import { useLendSimulation } from "./hooks";
import { HidePoolStats } from "../../contexts/actionbox/actionbox.context";
import { useActionContext } from "../../contexts";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { Button } from "~/components/ui/button";
import { EDGE_RUNTIME_WEBPACK } from "next/dist/shared/lib/constants";

// error handling
export type LendBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedLendType: ActionType;
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;
  showTokenSelection?: boolean;
  selectionGroups?: LendSelectionGroups[];
  hidePoolStats?: HidePoolStats;
  stakeAccounts?: ValidatorStakeGroup[];

  searchMode?: boolean;
  shouldBeHidden?: boolean;

  onCloseDialog?: () => void;
  setShouldBeHidden?: (hidden: boolean) => void;

  onComplete?: () => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const LendBox = ({
  nativeSolBalance,
  // tokenAccountMap,
  walletContextState,
  connected,
  marginfiClient,
  banks,
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
  stakeAccounts,
  setDisplaySettings,
  onCloseDialog,
  searchMode = false,
  shouldBeHidden = false,
  setShouldBeHidden,
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
  const hasRefreshed = React.useRef(false);
  const _prevSelectedBank = usePrevious(selectedBank);
  const _prevShouldBeHidden = usePrevious(shouldBeHidden);

  const [unclaimedMev, setUnclaimedMev] = React.useState<number>(0);

  /**
   * Handles visibility and state refresh logic when `searchMode` is enabled.
   * - If no bank is selected, hide the component.
   * - If a bank is selected, show the component.
   * - If `searchMode` is first enabled and a bank was already selected, refresh the state.
   */
  React.useEffect(() => {
    if (!shouldBeHidden) return;

    if (!selectedBank) {
      setShouldBeHidden?.(true);
    } else {
      setShouldBeHidden?.(false);
    }

    // Refresh state when searchMode is enabled and a bank was initially selected
    if (!hasRefreshed.current && _prevSelectedBank === undefined && selectedBank) {
      refreshState();
      hasRefreshed.current = true;
    }
  }, [shouldBeHidden, selectedBank, _prevSelectedBank, setShouldBeHidden, refreshState]);

  /**
   * Resets `hasRefreshed` when `searchMode` changes from `false` → `true`.
   * This ensures `refreshState()` can run again when toggling `searchMode` on.
   */
  React.useEffect(() => {
    if (_prevShouldBeHidden === false && shouldBeHidden === true) {
      hasRefreshed.current = false;
    }
  }, [shouldBeHidden, _prevShouldBeHidden]);

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

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

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
    selectedStakeAccount: selectedStakeAccount?.address || undefined,
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
    return checkLendActionAvailable({
      amount,
      connected,
      showCloseBalance,
      selectedBank,
      banks,
      marginfiAccount: selectedAccount,
      nativeSolBalance,
      lendMode,
    });
  }, [amount, connected, showCloseBalance, selectedBank, banks, selectedAccount, nativeSolBalance, lendMode]);

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
        onComplete: onComplete,
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
  ]);

  const hasErrorsWarnings = React.useMemo(() => {
    return (
      additionalActionMessages
        .concat(actionMessages)
        .filter((value) => value.actionMethod !== "INFO" && value.description).length > 0
    );
  }, [additionalActionMessages, actionMessages]);

  // fetch unclaimed MEV for staked collateral banks
  React.useEffect(() => {
    const fetchUnclaimedMev = async () => {
      const validatorVoteAccount = requestedBank?.meta.stakePool?.validatorVoteAccount;

      if (!validatorVoteAccount || !marginfiClient?.provider.connection) return;

      const unclaimedMev = await getStakePoolUnclaimedLamps(marginfiClient?.provider.connection, [
        validatorVoteAccount,
      ]);
      const unclaimedMevBankData = unclaimedMev.get(validatorVoteAccount.toBase58());
      setUnclaimedMev(unclaimedMevBankData?.pool ?? 0);
    };

    if (
      requestedBank &&
      requestedBank.info.rawBank.config.assetTag === AssetTag.STAKED &&
      lendMode === ActionType.Withdraw
    ) {
      fetchUnclaimedMev();
    }
  }, [requestedBank, marginfiClient, lendMode]);

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
      const stakeAccount = stakeAccounts.find((stakeAccount) =>
        stakeAccount.validator.equals(requestedBank.meta.stakePool?.validatorVoteAccount || PublicKey.default)
      );
      if (stakeAccount) {
        setSelectedStakeAccount({
          address: stakeAccount.accounts[0].pubkey,
          balance: stakeAccount.accounts[0].amount,
        });
      }
    }
  }, [requestedBank, stakeAccounts, setSelectedStakeAccount]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  React.useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (isMobile || event.key !== "Enter" || isLoading || !connected || searchMode) {
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
  }, [
    isLoading,
    connected,
    additionalActionMessages,
    actionMessages,
    showCloseBalance,
    handleLendingAction,
    isMobile,
    searchMode,
  ]);

  return (
    <ActionBoxContentWrapper>
      <div className="mb-4">
        <ActionInput
          banks={banks}
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
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
          searchMode={searchMode}
          onCloseDialog={() => {
            searchMode && onCloseDialog?.();
          }}
        />
      </div>
      {lendMode === ActionType.Deposit &&
        selectedBank &&
        selectedBank.info.rawBank.config.assetTag === 2 &&
        stakeAccounts &&
        stakeAccounts.length > 1 && (
          <StakeAccountSwitcher
            selectedBank={selectedBank}
            selectedStakeAccount={selectedStakeAccount?.address}
            stakeAccounts={stakeAccounts}
            onStakeAccountChange={(account) => {
              setSelectedStakeAccount(account);
              setAmountRaw("0");
            }}
          />
        )}
      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage
                _actionMessage={actionMessage}
                retry={refreshSimulation}
                isRetrying={simulationStatus.isLoading}
              />
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
      {selectedBank &&
        selectedBank.info.rawBank.config.assetTag === AssetTag.STAKED &&
        lendMode === ActionType.Withdraw &&
        unclaimedMev > 0 && (
          <div className="mt-4 space-y-3 bg-background/60 py-3 px-4 rounded-lg text-muted-foreground text-sm">
            <p>
              The {selectedBank.meta.tokenSymbol} stake pool has{" "}
              <strong className="text-foreground">{unclaimedMev / LAMPORTS_PER_SOL} SOL</strong> of unclaimed MEV
              rewards. MEV rewards can be permissionlessly claimed and will be added to the pool at the end of the
              epoch.
            </p>

            <Button className="w-full" variant="secondary" size="lg">
              Claim MEV rewards
            </Button>
          </div>
        )}
      <Preview
        actionSummary={actionSummary}
        selectedBank={selectedBank}
        isLoading={isLoading}
        lendMode={lendMode}
        hidePoolStats={hidePoolStats}
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
        banks={banks}
      />
    </ActionBoxContentWrapper>
  );
};

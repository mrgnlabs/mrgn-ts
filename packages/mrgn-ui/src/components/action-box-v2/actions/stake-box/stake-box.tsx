import React from "react";

import { ActionInput } from "./components/action-input";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PreviousTxn } from "@mrgnlabs/mrgn-utils";
import { useStakeBoxStore } from "./store";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { AmountPreview } from "./components/amount-preview";
import { ActionButton } from "../../components";
import { StatsPreview } from "./components/stats-preview";

export type StakeBoxProps = {
  nativeSolBalance: number;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  requestedActionType: ActionType;

  onConnect?: () => void;
  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const StakeBox = ({
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  nativeSolBalance,
  connected,
  isDialog,
}: StakeBoxProps) => {
  const [
    amountRaw,
    actionMode,
    selectedBank,
    simulationResult,
    actionTxns,
    errorMessage,
    isLoading,
    refreshState,
    refreshSelectedBanks,
    fetchActionBoxState,
    setActionMode,
    setAmountRaw,
    setSimulationResult,
    setActionTxns,
    setSelectedBank,
    setIsLoading,
    setErrorMessage,
  ] = useStakeBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.actionMode,
    state.selectedBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.isLoading,
    state.refreshState,
    state.refreshSelectedBanks,
    state.fetchActionBoxState,
    state.setActionMode,
    state.setAmountRaw,
    state.setSimulationResult,
    state.setActionTxns,
    state.setSelectedBank,
    state.setIsLoading,
    state.setErrorMessage,
  ]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode,
  });

  return (
    <>
      <div className="mb-6">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          connected={connected}
          selectedBank={selectedBank}
          lendMode={ActionType.MintLST}
          isDialog={true}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
        />
      </div>
      <div className="mb-6">
        <AmountPreview
          actionMode={actionMode}
          amount={amount}
          selectedBank={selectedBank}
          isEnabled={amount > 0}
          slippageBps={0}
        />
      </div>
      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={true}
          connected={connected}
          handleAction={() => {}}
          handleConnect={() => {}}
          buttonLabel={ActionType.MintLST ? "Mint LST" : "Unstake LST"}
        />
      </div>

      <div>
        <StatsPreview
          actionSummary={{
            actionPreview: {
              commission: 0,
              currentPrice: 0,
              projectedApy: 0,
              supply: 0,
            },
          }}
          actionMode={actionMode}
          isLoading={isLoading}
          selectedBank={selectedBank}
        />
      </div>
    </>
  );
};

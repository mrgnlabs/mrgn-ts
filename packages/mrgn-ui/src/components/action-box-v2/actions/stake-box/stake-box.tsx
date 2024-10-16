import React, { useEffect } from "react";

// TODO: sort imports
import { ActionInput } from "./components/action-input";
import { getPriceWithConfidence, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LstData, MarginfiActionParams, PreviousTxn, useConnection } from "@mrgnlabs/mrgn-utils";
import { useStakeBoxStore } from "./store";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { AmountPreview } from "./components/amount-preview";
import { ActionButton } from "../../components";
import { StatsPreview } from "./components/stats-preview";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { useStakeSimulation } from "./hooks";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchLstData } from "./utils";
import { NATIVE_MINT as SOL_MINT } from "@mrgnlabs/mrgn-common";
import { useActionBoxStore } from "../../store";
import { handleExecuteStakeAction } from "./utils/stake-action.utils";

export type StakeBoxProps = {
  nativeSolBalance: number;
  walletContextState?: WalletContextStateOverride | WalletContextState;
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
  requestedActionType,
  captureEvent,
  onComplete,
  onConnect,
}: StakeBoxProps) => {
  const [
    amountRaw,
    actionMode,
    selectedBank,
    simulationResult,
    actionTxns,
    errorMessage,
    isLoading,
    lstData,
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
    setLstData,
  ] = useStakeBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.actionMode,
    state.selectedBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.isLoading,
    state.lstData,
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
    state.setLstData,
  ]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode,
  });

  const [slippage, setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.slippageBps,
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const solUsdValue = React.useMemo(() => {
    const bank = banks.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [banks]);

  useEffect(() => {
    const _fetchLstData = async (connection: Connection) => {
      setLstData(await fetchLstData(connection));
    };

    const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE!, "confirmed");
    if (connection) _fetchLstData(connection);
  }, [setLstData]);

  const [actionSummary, setActionSummary] = React.useState<{
    supply: number;
    projectedApy: number;
    currentPrice: number;
    commission: number;
  }>();

  useEffect(() => {
    if (lstData && solUsdValue) {
      setActionSummary({
        commission: lstData.solDepositFee,
        currentPrice: lstData.lstSolValue,
        projectedApy: lstData.projectedApy,
        supply: lstData.tvl * solUsdValue,
      });
    }
  }, [lstData, solUsdValue]);

  const { actionSimulationSummary } = useStakeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    selectedBank,
    actionMode,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading,
    isRefreshTxn: true, // TODO: fill, see repay-collat-box
    slippageBps: slippage,
    marginfiClient,
    lstData: lstData ?? null,
  });

  const handleStakeAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient) {
      return;
    }

    const action = async () => {
      const params = {
        actionTxns,
        marginfiClient,
      };

      await handleExecuteStakeAction({
        params,
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
          }); // TODO: update

          onComplete &&
            onComplete({
              txn: txnSigs.pop() ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: amount,
                type: ActionType.RepayCollat,
                bank: selectedBank as ActiveBankInfo,
              },
            }); // TODO: update
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
    captureEvent,
    marginfiClient,
    nativeSolBalance,
    onComplete,
    selectedAccount,
    selectedBank,
    setAmountRaw,
    setIsActionComplete,
    setIsLoading,
    setPreviousTxn,
  ]);
  React.useEffect(() => {
    console.log(actionSimulationSummary);
  }, [actionSimulationSummary]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType: requestedActionType, requestedBank });
  }, [requestedActionType, requestedBank, fetchActionBoxState]);

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
          isDialog={isDialog}
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
          handleAction={handleStakeAction}
          handleConnect={() => {}}
          buttonLabel={ActionType.MintLST ? "Mint LST" : "Unstake LST"}
        />
      </div>

      {actionSummary && (
        <div>
          <StatsPreview
            actionSummary={{
              actionPreview: actionSummary,
            }}
            actionMode={actionMode}
            isLoading={isLoading}
            selectedBank={selectedBank}
          />
        </div>
      )}
    </>
  );
};

import React from "react";

import { Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  AccountSummary,
  ActionType,
  ActiveBankInfo,
  computeAccountSummary,
  ExtendedBankInfo,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { getSimulationResult, simulatedHealthFactor } from "../utils/move-position.utils";
import { ActionMessageType } from "@mrgnlabs/mrgn-utils";

interface ActionSummary {
  health: number;
  // liqPrice: number;
}

type MovePositionSimulationProps = {
  actionTxns: (Transaction | VersionedTransaction)[] | null;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  accountToMoveTo: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];
  activeBank: ActiveBankInfo;
  accountSummary: AccountSummary | null;
  setActionTxns: (actionTxn: (Transaction | VersionedTransaction)[]) => void;
  setIsLoading: (state: boolean) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
};

export const useMoveSimulation = ({
  marginfiClient,
  accountToMoveTo,
  selectedAccount,
  activeBank,
  accountSummary,
  setActionTxns,
  setIsLoading,
  setErrorMessage,
}: MovePositionSimulationProps) => {
  const [actionSummary, setActionSummary] = React.useState<ActionSummary | null>(null);

  const generateTxns = React.useCallback(async () => {
    if (!marginfiClient || !accountToMoveTo) {
      return;
    }
    if (activeBank.userInfo.maxWithdraw < activeBank.position.amount) {
      setErrorMessage({
        isEnabled: true,
        actionMethod: "ERROR",
        description: "Cannot move position, insufficient collateral.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const connection = marginfiClient.provider.connection;
      const blockHash = await connection.getLatestBlockhash();
      const lookupTables = marginfiClient.addressLookupTables;

      const withdrawTx = await selectedAccount?.makeWithdrawTx(activeBank.position.amount, activeBank.address, true);
      if (!withdrawTx) return;
      const bundleTipIx = makeBundleTipIx(marginfiClient?.wallet.publicKey);
      const depositIx = await accountToMoveTo.makeDepositIx(activeBank.position.amount, activeBank.address);
      if (!depositIx) return;
      const depositInstruction = new TransactionMessage({
        payerKey: marginfiClient.wallet.publicKey,
        recentBlockhash: blockHash.blockhash,
        instructions: [...depositIx.instructions, bundleTipIx],
      });
      const depositTx = new VersionedTransaction(depositInstruction.compileToV0Message(lookupTables));
      return [...withdrawTx.feedCrankTxs, withdrawTx.withdrawTx, depositTx];
    } catch (error) {
      console.error("Error creating transactions", error);
    }
  }, [marginfiClient, accountToMoveTo, activeBank, setErrorMessage, setIsLoading, selectedAccount]);

  const handleSimulateTxns = React.useCallback(async () => {
    try {
      const txns = await generateTxns();

      if (!txns || !marginfiClient || !selectedAccount || !accountSummary) return;

      const { actionMethod, simulationResult } = await getSimulationResult({
        marginfiClient,
        txns,
        selectedBank: activeBank,
        selectedMarginfiAccount: selectedAccount,
      });

      if (actionMethod) {
        setErrorMessage(actionMethod);
        setActionTxns([]);
      } else {
        if (!simulationResult) return;

        const updatedHealthFactor = simulatedHealthFactor(simulationResult);
        setActionSummary({
          health: updatedHealthFactor,
        });
        setErrorMessage(null);
        setActionTxns(txns);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [
    generateTxns,
    marginfiClient,
    activeBank,
    setErrorMessage,
    setActionTxns,
    setIsLoading,
    accountSummary,
    selectedAccount,
  ]);

  return {
    handleSimulateTxns,
    actionSummary,
    setActionSummary,
  };
};

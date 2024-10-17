import React from "react";

import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMethod,
  deserializeInstruction,
  getSwapQuoteWithRetry,
  LstData,
  StakeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  LST_MINT,
  LUT_PROGRAM_AUTHORITY_INDEX,
  NATIVE_MINT as SOL_MINT,
  uiToNative,
} from "@mrgnlabs/mrgn-common";

import { fetchLstData, getAdressLookupTableAccounts, getSimulationResult, handleStakeTx } from "../utils";
import { useActionBoxStore } from "../../../store";

type StakeSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;

  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  actionTxns: StakeActionTxns;
  simulationResult: any | null;
  isRefreshTxn: boolean;
  marginfiClient: MarginfiClient | null;
  solPriceUsd: number;
  setSimulationResult: (result: any | null) => void;
  setActionTxns: (actionTxns: StakeActionTxns) => void;
  setErrorMessage: (error: ActionMethod | null) => void;
  setIsLoading: ({ state, type }: { state: boolean; type: string | null }) => void;
};

export function useStakeSimulation({
  debouncedAmount,
  selectedAccount,

  selectedBank,
  actionMode,
  actionTxns,
  simulationResult,
  isRefreshTxn,
  marginfiClient,
  solPriceUsd,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: StakeSimulationProps) {
  const [slippageBps, platformFeeBps] = useActionBoxStore((state) => [state.slippageBps, state.platformFeeBps]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const [lstData, setLstData] = React.useState<LstData | null>(null);

  const actionSummary = React.useMemo(() => {
    if (lstData && solPriceUsd) {
      return {
        commission: lstData.solDepositFee,
        currentPrice: lstData.lstSolValue,
        projectedApy: lstData.projectedApy,
        supply: lstData.tvl * solPriceUsd,
      };
    }
  }, [lstData, solPriceUsd]);

  const handleFetchLstData = React.useCallback(async () => {
    // TODO: this is more of a refactor across all actionboxes, find a better way to feed connection
    const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE!, "confirmed");
    if (connection) {
      const lstData = await fetchLstData(connection);
      setLstData(lstData as LstData);
    }
  }, [setLstData]);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        if (selectedAccount && selectedBank && txns.length > 0) {
          await getSimulationResult({
            marginfiClient: marginfiClient as MarginfiClient,
            txns,
            selectedBank,
            selectedAccount,
          });

          setSimulationResult(simulationResult);
        } else {
          setSimulationResult(null);
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
      } finally {
        setIsLoading({ type: "SIMULATION", state: false });
      }
    },
    [selectedAccount, selectedBank, marginfiClient, setSimulationResult, simulationResult, setIsLoading]
  );

  const fetchTxs = React.useCallback(
    async (amount: number, actionType: ActionType) => {
      const connection = marginfiClient?.provider.connection;
      const jupiterQuoteApi = createJupiterApiClient();

      if (amount === 0 || !selectedBank || !connection || !lstData) {
        const missingParams = [];
        if (amount === 0) missingParams.push("amount");
        if (!selectedBank) missingParams.push("selectedBank");
        if (!connection) missingParams.push("connection");
        if (!lstData) missingParams.push("lstData");

        setActionTxns({
          actionTxn: null,
          additionalTxns: [],
          actionQuote: null,
        });
        return;
      }

      setIsLoading({ type: "SIMULATION", state: true });

      try {
        const blockhash = (await connection.getLatestBlockhash()).blockhash;
        let swapQuote = null;
        let swapTx = null;

        // Determine if swap is needed based on action type or mint type
        if (actionType === ActionType.UnstakeLST || selectedBank.info.state.mint.toBase58() !== SOL_MINT.toBase58()) {
          swapQuote = await getSwapQuoteWithRetry({
            amount: uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber(),
            inputMint:
              actionType === ActionType.UnstakeLST ? LST_MINT.toBase58() : selectedBank.info.state.mint.toBase58(),
            outputMint: SOL_MINT.toBase58(),
            platformFeeBps,
            slippageBps,
            swapMode: "ExactIn",
          });

          if (!swapQuote) return; // TODO: proper error handling

          const { computeBudgetInstructions, swapInstruction, setupInstructions, addressLookupTableAddresses } =
            await jupiterQuoteApi.swapInstructionsPost({
              swapRequest: {
                quoteResponse: swapQuote,
                userPublicKey: marginfiClient.wallet.publicKey.toBase58(),
                feeAccount: undefined,
                programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
              },
            });

          const swapIx = deserializeInstruction(swapInstruction);
          const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
          const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
          const AddressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);

          const bundleTipIx = makeBundleTipIx(marginfiClient.wallet.publicKey);

          const swapMessage = new TransactionMessage({
            payerKey: marginfiClient.wallet.publicKey,
            recentBlockhash: blockhash,
            instructions: [bundleTipIx, ...cuInstructionsIxs, ...setupInstructionsIxs, swapIx],
          });

          swapTx = new VersionedTransaction(swapMessage.compileToV0Message(AddressLookupAccounts));
        }

        // Separate stake and unstake transaction handling
        if (actionType === ActionType.MintLST) {
          const _actionTxns = await handleStakeTx(
            blockhash,
            amount,
            swapQuote,
            swapTx,
            selectedBank,
            marginfiClient,
            connection,
            lstData
          );
          setActionTxns(_actionTxns);
        } else {
          setActionTxns({
            actionTxn: swapTx,
            additionalTxns: [],
            actionQuote: swapQuote,
          });
        }
      } catch (error) {
        handleError(actionType);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marginfiClient, selectedBank, slippageBps, lstData, setActionTxns, setIsLoading, platformFeeBps]
  );

  function handleError(actionType: ActionType) {
    const errorMessage =
      actionType === ActionType.MintLST
        ? STATIC_SIMULATION_ERRORS.STAKE_FAILED
        : STATIC_SIMULATION_ERRORS.UNSTAKE_FAILED;

    setErrorMessage(errorMessage);
    setIsLoading({ type: "SIMULATION", state: false });
  }

  React.useEffect(() => {
    handleFetchLstData();
  }, [handleFetchLstData]);

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchTxs(debouncedAmount ?? 0, actionMode);
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchTxs, actionMode]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.additionalTxns ?? []),
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  return {
    lstData,
    actionSummary, // TODO: in future we can return lstAta data to display exact lst output amount
  };
}

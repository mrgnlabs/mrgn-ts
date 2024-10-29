import React from "react";

import { Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createJupiterApiClient } from "@jup-ag/api";

import { makeBundleTipIx, makeUnwrapSolIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  deserializeInstruction,
  extractErrorString,
  getSwapQuoteWithRetry,
  LstData,
  StakeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { LST_MINT, LUT_PROGRAM_AUTHORITY_INDEX, NATIVE_MINT as SOL_MINT, uiToNative } from "@mrgnlabs/mrgn-common";

import { getAdressLookupTableAccounts, getSimulationResult, handleStakeTx } from "../utils";
import { useActionBoxStore } from "../../../store";

type StakeSimulationProps = {
  debouncedAmount: number;
  lstData: LstData | null;

  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  actionTxns: StakeActionTxns;
  simulationResult: any | null;
  marginfiClient: MarginfiClient | null;
  setSimulationResult: (result: any | null) => void;
  setActionTxns: (actionTxns: StakeActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ state, type }: { state: boolean; type: string | null }) => void;
};

export function useStakeSimulation({
  debouncedAmount,
  lstData,
  selectedBank,
  actionMode,
  actionTxns,
  simulationResult,
  marginfiClient,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: StakeSimulationProps) {
  const [slippageBps, platformFeeBps] = useActionBoxStore((state) => [
    state.slippageBps,
    state.platformFeeBps,
    state.priorityFee,
  ]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        if (selectedBank && txns.length > 0) {
          const { actionMethod } = await getSimulationResult({
            marginfiClient: marginfiClient as MarginfiClient,
            txns,
            selectedBank,
          });

          if (actionMethod) {
            setErrorMessage(actionMethod);
            setSimulationResult(null);
          } else {
            setErrorMessage(null);
            setSimulationResult(simulationResult);
          }
        } else {
          setSimulationResult(null);
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading({ type: "SIMULATION", state: false });
      }
    },
    [selectedBank, marginfiClient, setSimulationResult, simulationResult, setIsLoading, setErrorMessage]
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

          if (!swapQuote) {
            setErrorMessage(STATIC_SIMULATION_ERRORS.STAKE_SWAP_SIMULATION_FAILED);
            return;
          }

          const {
            computeBudgetInstructions,
            swapInstruction,
            setupInstructions,
            cleanupInstruction,
            addressLookupTableAddresses,
          } = await jupiterQuoteApi.swapInstructionsPost({
            swapRequest: {
              quoteResponse: swapQuote,
              userPublicKey: marginfiClient.wallet.publicKey.toBase58(),
              feeAccount: undefined,
              programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
            },
          });

          const swapIx = deserializeInstruction(swapInstruction);
          const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
          const cleanupInstructionIx = deserializeInstruction(cleanupInstruction);
          const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
          const AddressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);
          const unwrapSolIx = makeUnwrapSolIx(marginfiClient.wallet.publicKey);

          const swapMessage = new TransactionMessage({
            payerKey: marginfiClient.wallet.publicKey,
            recentBlockhash: blockhash,
            instructions: [...cuInstructionsIxs, ...setupInstructionsIxs, swapIx, unwrapSolIx],
          });

          swapTx = new VersionedTransaction(swapMessage.compileToV0Message(AddressLookupAccounts));
        }

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
        const msg = extractErrorString(error);
        console.error(`Error while simulating stake action: ${msg}`);
        setErrorMessage(STATIC_SIMULATION_ERRORS.STAKE_SIMULATION_FAILED);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marginfiClient, selectedBank, slippageBps, setActionTxns, setIsLoading, platformFeeBps]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchTxs(debouncedAmount ?? 0, actionMode);
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchTxs, actionMode]);

  return { handleSimulation };
}

import React, { useEffect } from "react";

import {
  AccountInfo,
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

import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMethod,
  deserializeInstruction,
  getSwapQuoteWithRetry,
  handleError,
  LstData,
  StakeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { calculateSummary, fetchLstData, getAdressLookupTableAccounts, getSimulationResult } from "../utils";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  LST_MINT,
  LUT_PROGRAM_AUTHORITY_INDEX,
  NATIVE_MINT as SOL_MINT,
  uiToNative,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { createJupiterApiClient } from "@jup-ag/api";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { useActionBoxStore } from "../../../store"; //always import actionbox like this

type StakeSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  accountSummary?: AccountSummary;
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
  setIsLoading: (isLoading: boolean) => void;
};

export function useStakeSimulation({
  debouncedAmount,
  selectedAccount,
  accountSummary,
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
  const [slippageBps, priorityFee] = useActionBoxStore((state) => [state.slippageBps, state.priorityFee]);

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
        setIsLoading(false);
      }
    },
    [selectedAccount, selectedBank, marginfiClient, setSimulationResult, simulationResult, setIsLoading]
  );

  const fetchStakeTxs = React.useCallback(
    async (amount: number) => {
      const connection = marginfiClient?.provider.connection;

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

      setIsLoading(true);
      try {
        const swapQuote = await getSwapQuoteWithRetry({
          amount: uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber(),
          inputMint: selectedBank.info.state.mint.toBase58(),
          outputMint: SOL_MINT.toBase58(),
          // platformFeeBps: 0, // TODO: fill
          slippageBps: slippageBps,
          swapMode: "ExactIn",
        });

        if (!swapQuote) {
          return;
        }

        const jupiterQuoteApi = createJupiterApiClient();
        const blockhash = (await connection.getLatestBlockhash()).blockhash;

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

        const swapMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [...cuInstructionsIxs, ...setupInstructionsIxs, swapIx],
        });
        const swapTx = new VersionedTransaction(swapMessage.compileToV0Message(AddressLookupAccounts));

        const userSolTransfer = new Keypair();
        const signers: Signer[] = [userSolTransfer];
        const stakeIxs: TransactionInstruction[] = [];

        stakeIxs.push(
          SystemProgram.transfer({
            fromPubkey: marginfiClient.wallet.publicKey,
            toPubkey: userSolTransfer.publicKey,
            lamports: Number(swapQuote.outAmount),
          })
        );

        const destinationTokenAccount = getAssociatedTokenAddressSync(
          lstData.accountData.poolMint,
          marginfiClient.wallet.publicKey,
          true
        );
        const ataData = await connection.getAccountInfo(destinationTokenAccount);

        if (!ataData) {
          stakeIxs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              marginfiClient.wallet.publicKey,
              destinationTokenAccount,
              marginfiClient.wallet.publicKey,
              lstData.accountData.poolMint
            )
          );
        }

        const [withdrawAuthority] = PublicKey.findProgramAddressSync(
          [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
          solanaStakePool.STAKE_POOL_PROGRAM_ID
        );

        stakeIxs.push(
          solanaStakePool.StakePoolInstruction.depositSol({
            stakePool: lstData.poolAddress,
            reserveStake: lstData.accountData.reserveStake,
            fundingAccount: userSolTransfer.publicKey,
            destinationPoolAccount: destinationTokenAccount,
            managerFeeAccount: lstData.accountData.managerFeeAccount,
            referralPoolAccount: destinationTokenAccount,
            poolMint: lstData.accountData.poolMint,
            lamports: Number(swapQuote.outAmount),
            withdrawAuthority,
          })
        );

        const bundleTipIx = makeBundleTipIx(marginfiClient.wallet.publicKey);

        const stakeMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [bundleTipIx, ...stakeIxs],
        });

        const stakeTx = new VersionedTransaction(stakeMessage.compileToV0Message([]));
        stakeTx.sign(signers);

        setActionTxns({
          actionTxn: stakeTx,
          actionQuote: swapQuote,
          additionalTxns: [swapTx],
        });
      } catch (error) {
        // handleError(error, selectedBank) // TODO: implement this
        setErrorMessage(STATIC_SIMULATION_ERRORS.STAKE_FAILED);
        setIsLoading(false);
      }
    },
    [marginfiClient, selectedBank, slippageBps, lstData, setActionTxns, setIsLoading, setErrorMessage]
  );

  const fetchUnstakeTxs = React.useCallback(
    async (amount: number) => {
      const connection = marginfiClient?.provider.connection;
      const jupiterQuoteApi = createJupiterApiClient();

      if (amount === 0 || !selectedBank || !selectedAccount || !connection || !lstData) {
        return;
      }
      setIsLoading(true);

      try {
        const blockhash = (await connection.getLatestBlockhash()).blockhash;

        const swapQuote = await getSwapQuoteWithRetry({
          amount: uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber(),
          inputMint: LST_MINT.toBase58(),
          outputMint: SOL_MINT.toBase58(),
          // platformFeeBps: 0,
          slippageBps: slippageBps,
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

        const swapMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [...cuInstructionsIxs, ...setupInstructionsIxs, swapIx],
        });
        const swapTx = new VersionedTransaction(swapMessage.compileToV0Message(AddressLookupAccounts));
        setActionTxns({
          actionTxn: swapTx,
          additionalTxns: [],
          actionQuote: swapQuote,
        });
      } catch (error) {
        // handleError(error, selectedBank) // TODO: implement this
        setErrorMessage(STATIC_SIMULATION_ERRORS.UNSTAKE_FAILED);
        setIsLoading(false);
      }
    },
    [lstData, marginfiClient, selectedAccount, selectedBank, setActionTxns, setIsLoading, slippageBps, setErrorMessage]
  );

  React.useEffect(() => {
    handleFetchLstData();
  }, [handleFetchLstData]);

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      if (actionMode === ActionType.MintLST) {
        fetchStakeTxs(debouncedAmount ?? 0);
      } else if (actionMode === ActionType.UnstakeLST) {
        fetchUnstakeTxs(debouncedAmount ?? 0);
      }
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchStakeTxs, actionMode, fetchUnstakeTxs]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.additionalTxns ?? []),
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  // const actionSimulationSummary = React.useMemo(() => {
  //   return handleActionSummary(accountSummary, simulationResult ?? undefined);
  // }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary, // TODO: in future we can return lstAta data to display exact lst output amount
  };
}
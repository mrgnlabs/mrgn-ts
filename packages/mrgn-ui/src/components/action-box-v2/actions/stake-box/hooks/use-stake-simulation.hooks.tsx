import React from "react";

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

import {
  Bank,
  makeBundleTipIx,
  MarginfiAccount,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMethod,
  deserializeInstruction,
  getFeeAccount,
  getSwapQuoteWithRetry,
  LstData,
  StakeActionTxns,
  TOKEN_2022_MINTS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { calculateSummary, getAdressLookupTableAccounts, getSimulationResult } from "../utils";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  LST_MINT,
  LUT_PROGRAM_AUTHORITY_INDEX,
  NATIVE_MINT as SOL_MINT,
  uiToNative,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { AddressLookupTableAccount } from "@solana/web3.js";

type StakeSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  actionTxns: StakeActionTxns;
  simulationResult: any | null;
  isRefreshTxn: boolean;
  slippageBps: number;
  marginfiClient: MarginfiClient | null;
  lstData: LstData | null;

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
  slippageBps,
  marginfiClient,
  setSimulationResult,
  lstData,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: StakeSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);

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
      }
    },
    [marginfiClient, selectedBank, selectedAccount, setSimulationResult]
  );

  // const handleActionSummary = React.useCallback(
  //   (summary?: AccountSummary, result?: SimulationResult) => {
  //     if (selectedAccount && summary && selectedBank) {
  //       return calculateSummary({
  //         simulationResult: result ?? undefined,
  //         bank: selectedBank,
  //         accountSummary: summary,
  //         actionTxns: actionTxns,
  //       });
  //     }
  //   },
  //   [selectedAccount, selectedBank, actionTxns]
  // );

  const fetchStakeTxs = React.useCallback(
    async (amount: number) => {
      const connection = marginfiClient?.provider.connection;

      if (amount === 0 || !selectedBank || !selectedAccount || !connection || !lstData) {
        return;
      }

      try {
        const swapObject = await getSwapQuoteWithRetry({
          amount: uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber(),
          inputMint: selectedBank.info.state.mint.toBase58(),
          outputMint: SOL_MINT.toBase58(),
          // platformFeeBps: 0, // TODO: fill
          slippageBps: slippageBps,
          swapMode: "ExactIn",
        });

        // console.log("swapObject", swapObject);

        if (!swapObject) return;

        const jupiterQuoteApi = createJupiterApiClient();
        const blockhash = (await connection.getLatestBlockhash()).blockhash;

        // let feeAccountInfo: AccountInfo<any> | null = null;
        // const feeMint = swapObject.outputMint;
        // const feeAccount = getFeeAccount(new PublicKey(feeMint));
        // if (!TOKEN_2022_MINTS.includes(feeMint)) {
        //   feeAccountInfo = await connection.getAccountInfo(new PublicKey(feeAccount));
        // }

        const { computeBudgetInstructions, swapInstruction, setupInstructions, addressLookupTableAddresses } =
          await jupiterQuoteApi.swapInstructionsPost({
            swapRequest: {
              quoteResponse: swapObject,
              userPublicKey: selectedAccount.authority.toBase58(),
              feeAccount: undefined,
              programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
            },
          });

        const { swapTransaction: swapTransactionRaw } = await jupiterQuoteApi.swapPost({
          swapRequest: {
            quoteResponse: swapObject,
            userPublicKey: selectedAccount.authority.toBase58(), // TODO use wallet public key
            feeAccount: undefined,
            programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
          },
        });

        const swapTransactionBuf = Buffer.from(swapTransactionRaw, "base64");
        const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);

        // console.log(selectedAccount.authority.toString());

        // console.log("swapInstruction", swapInstruction);

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

        const simulation = await connection.simulateTransaction(swapTx);
        // console.log({ simulation });

        // console.log("swapTx", swapTx);
        const userSolTransfer = new Keypair();
        const signers: Signer[] = [userSolTransfer];
        const stakeIxs: TransactionInstruction[] = [];

        stakeIxs.push(
          SystemProgram.transfer({
            fromPubkey: marginfiClient.wallet.publicKey,
            toPubkey: userSolTransfer.publicKey,
            lamports: Number(swapObject.outAmount),
          })
        );

        const destinationTokenAccount = getAssociatedTokenAddressSync(
          lstData.accountData.poolMint,
          marginfiClient.wallet.publicKey,
          true
        );
        const ataData = await connection.getAccountInfo(destinationTokenAccount);
        console.log({ destinationTokenAccount });
        console.log({ poolmint: lstData.accountData.poolMint.toString() });

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

        console.log("destinationTokenAccount", destinationTokenAccount);

        const [withdrawAuthority] = PublicKey.findProgramAddressSync(
          [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
          solanaStakePool.STAKE_POOL_PROGRAM_ID
        );

        console.log({ poolAddress: lstData.poolAddress });
        console.log("withdrawAuthority", withdrawAuthority);

        stakeIxs.push(
          solanaStakePool.StakePoolInstruction.depositSol({
            stakePool: lstData.poolAddress,
            reserveStake: lstData.accountData.reserveStake,
            fundingAccount: userSolTransfer.publicKey,
            destinationPoolAccount: destinationTokenAccount,
            managerFeeAccount: lstData.accountData.managerFeeAccount,
            referralPoolAccount: destinationTokenAccount,
            poolMint: lstData.accountData.poolMint,
            lamports: Number(swapObject.outAmount),
            withdrawAuthority,
          })
        );

        console.log("stakeIx", stakeIxs);

        const bundleTipIx = makeBundleTipIx(marginfiClient.wallet.publicKey);

        console.log("bundleTipIx", bundleTipIx);
        const stakeMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [bundleTipIx, ...stakeIxs],
        });

        const stakeTx = new VersionedTransaction(stakeMessage.compileToV0Message([]));
        stakeTx.sign(signers);

        console.log("stakeTx", stakeTx);
        setActionTxns({
          actionTxn: stakeTx,
          // additionalTxns: [],
          actionQuote: swapObject, // TODO: update name
          additionalTxns: [swapTx],
        });
      } catch (error) {
        console.error("Error fetching transactions", error);
      }
    },
    [marginfiClient, selectedBank, selectedAccount, slippageBps, lstData, setActionTxns]
  );

  const fetchUnstakeTxs = React.useCallback(async (amount: number) => {
    const connection = marginfiClient?.provider.connection;
    const jupiterQuoteApi = createJupiterApiClient();

    if (amount === 0 || !selectedBank || !selectedAccount || !connection || !lstData) {
      return;
    }
    try {
      const blockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

      const swapObject = await getSwapQuoteWithRetry({
        amount: uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber(),
        inputMint: LST_MINT.toBase58(),
        outputMint: SOL_MINT.toBase58(),
        platformFeeBps: 0,
        slippageBps: slippageBps,
        swapMode: "ExactIn",
      });

      if (!swapObject) return; // TODO: proper error handling

      let feeAccountInfo: AccountInfo<any> | null = null;
      const feeMint = swapObject.outputMint; // TODO: output or input?
      const feeAccount = getFeeAccount(new PublicKey(feeMint));
      if (!TOKEN_2022_MINTS.includes(feeMint)) {
        feeAccountInfo = await connection.getAccountInfo(new PublicKey(feeAccount));
      }

      const { swapInstruction, setupInstructions, addressLookupTableAddresses } =
        await jupiterQuoteApi.swapInstructionsPost({
          swapRequest: {
            quoteResponse: swapObject,
            userPublicKey: selectedAccount.authority.toBase58(),
            feeAccount: feeAccountInfo ? feeAccount : undefined,
          },
        });

      const swapIx = deserializeInstruction(swapInstruction);
      const setupInstructionsIx = setupInstructions.map((value) => deserializeInstruction(value));
      const AddressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);

      const swapMessage = new TransactionMessage({
        payerKey: marginfiClient.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [...setupInstructionsIx, swapIx],
      });
      const swapTx = new VersionedTransaction(swapMessage.compileToV0Message(AddressLookupAccounts));
      console.log("swapTx", swapTx);

      setActionTxns({
        actionTxn: swapTx,
        additionalTxns: [],
        actionQuote: swapObject, // TODO: rename
      });
    } catch (error) {
      console.log(error); // TODO: proper error handling
    }
  }, []);

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      if (actionMode === ActionType.MintLST) {
        fetchStakeTxs(debouncedAmount ?? 0);
      } else if (actionMode === ActionType.UnstakeLST) {
        fetchUnstakeTxs(debouncedAmount ?? 0);
      }
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchStakeTxs]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.additionalTxns ?? []),
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
    ]);
  }, [actionTxns]);

  // const actionSimulationSummary = React.useMemo(() => {
  //   return handleActionSummary(accountSummary, simulationResult ?? undefined);
  // }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSimulationSummary: undefined, // TODO: in future we can return lstAta data to display exact lst output amount
  };
}

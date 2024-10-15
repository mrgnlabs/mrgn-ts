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
  TOKEN_2022_MINTS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { getSimulationResult } from "../utils";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT as SOL_MINT,
  uiToNative,
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
  actionTxns: {
    actionTxn: VersionedTransaction | Transaction | null;
    additionalTxns: (VersionedTransaction | Transaction)[];
  };
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;
  slippageBps: number;
  marginfiClient: MarginfiClient | null;
  lstData: LstData | null;

  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: {
    actionTxn: VersionedTransaction | Transaction | null;
    additionalTxns: (VersionedTransaction | Transaction)[];
  }) => void;
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
          const simulationResult = await getSimulationResult({
            actionMode: actionMode,
            account: selectedAccount,
            bank: selectedBank,
            amount: debouncedAmount,
            txns,
          });
        } else {
          setSimulationResult(null);
        }
      } catch (error) {}
    },
    [selectedAccount, selectedBank, setSimulationResult, actionMode, debouncedAmount]
  );

  const handleActionSummary = React.useCallback(() => {}, []);

  const fetchSwapTxn = React.useCallback(
    async (amount: number) => {
      const connection = marginfiClient?.provider.connection;

      // TODO: add error handling
      if (amount === 0 || !selectedBank || !selectedAccount || !connection || !lstData) {
        return;
      }

      // setIsLoading(true);
      try {
        const swapObject = await getSwapQuoteWithRetry(
          {
            amount: uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber(),
            inputMint: selectedBank?.info.state.mint.toBase58(),
            outputMint: SOL_MINT.toBase58(),
            platformFeeBps: 0, // TODO: update with correct value
            slippageBps: slippageBps,
            swapMode: "ExactIn",
          },
          2,
          1000
        );

        if (!swapObject) return;

        // const swapObject = {
        //   inputMint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        //   inAmount: "100000000",
        //   outputMint: "So11111111111111111111111111111111111111112",
        //   outAmount: "149705",
        //   otherAmountThreshold: "148208",
        //   swapMode: "ExactIn",
        //   slippageBps: 100,
        //   platformFee: {
        //     amount: "0",
        //     feeBps: 0,
        //   },
        //   priceImpactPct: "0",
        //   routePlan: [
        //     {
        //       swapInfo: {
        //         ammKey: "D3gZwng2MgZGjktYcKpbR8Bz8653i4qCgzHCf5E4TcZb",
        //         label: "OpenBook V2",
        //         inputMint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        //         outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        //         inAmount: "100000000",
        //         outAmount: "23309",
        //         feeAmount: "0",
        //         feeMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        //       },
        //       percent: 100,
        //     },
        //     {
        //       swapInfo: {
        //         ammKey: "HfgjZDmexhFVD28Vkb1NbQwWeXP3uDcVTLPjSGHmRHhL",
        //         label: "Meteora DLMM",
        //         inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        //         outputMint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        //         inAmount: "23309",
        //         outAmount: "26626",
        //         feeAmount: "24",
        //         feeMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        //       },
        //       percent: 100,
        //     },
        //     {
        //       swapInfo: {
        //         ammKey: "8ZBbyDGErfqvY65fRZnm6dtQBe3REuAPqzRN7819fzeW",
        //         label: "Meteora DLMM",
        //         inputMint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        //         outputMint: "So11111111111111111111111111111111111111112",
        //         inAmount: "26626",
        //         outAmount: "149705",
        //         feeAmount: "14",
        //         feeMint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        //       },
        //       percent: 100,
        //     },
        //   ],
        //   contextSlot: 295697757,
        //   timeTaken: 1.105756338,
        // } as QuoteResponse;

        console.log("swapobject", swapObject);

        const jupiterQuoteApi = createJupiterApiClient();
        const blockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

        console.log(blockhash);

        let feeAccountInfo: AccountInfo<any> | null = null;
        const feeMint = swapObject.outputMint;
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
          }); // Might have to use setupInstructions
        const swapIx = deserializeInstruction(swapInstruction);
        const setupInstructionsIx = setupInstructions.map((value) => deserializeInstruction(value));
        const AddressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);

        console.log({ swapIx, setupInstructionsIx, AddressLookupAccounts });

        const swapMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [...setupInstructionsIx, swapIx],
        });
        const swapTx = new VersionedTransaction(swapMessage.compileToV0Message(AddressLookupAccounts));

        console.log("4", swapTx);

        const userSolTransfer = new Keypair();
        const signers: Signer[] = [userSolTransfer];
        const stakeIx: TransactionInstruction[] = [];

        stakeIx.push(
          SystemProgram.transfer({
            fromPubkey: marginfiClient.wallet.publicKey,
            toPubkey: userSolTransfer.publicKey,
            lamports: Number(swapObject.outAmount),
          })
        );

        console.log("5", stakeIx);

        let destinationTokenAccount; // TODO: check if destination token account exists, not sure how, also not done in current code (always undefined)
        if (!destinationTokenAccount) {
          const associatedAddress = getAssociatedTokenAddressSync(
            lstData.accountData.poolMint,
            marginfiClient.wallet.publicKey,
            true
          );
          stakeIx.push(
            createAssociatedTokenAccountIdempotentInstruction(
              marginfiClient.wallet.publicKey,
              associatedAddress,
              marginfiClient.wallet.publicKey,
              lstData.accountData.poolMint
            )
          );
          destinationTokenAccount = associatedAddress;
        }

        console.log("6", stakeIx);

        const [withdrawAuthority] = PublicKey.findProgramAddressSync(
          [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
          solanaStakePool.STAKE_POOL_PROGRAM_ID
        );

        stakeIx.push(
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

        console.log(stakeIx);

        const bundleTipIx = makeBundleTipIx(marginfiClient.wallet.publicKey);

        console.log("7", bundleTipIx);

        const stakeMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [bundleTipIx, ...stakeIx],
        });

        console.log("8", stakeMessage);

        const stakeTx = new VersionedTransaction(stakeMessage.compileToV0Message([]));
        stakeTx.sign(signers);

        const xxx = await marginfiClient.simulateTransactions(
          [swapTx],
          [marginfiClient.wallet.publicKey, selectedBank.address]
        );

        console.log("9", xxx);
      } catch (error) {
        console.log(error);
      }
    },
    [marginfiClient, selectedBank, selectedAccount, lstData, slippageBps]
  );

  const fetchStakeTxn = React.useCallback(async (amount: number) => {}, []);

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchSwapTxn(debouncedAmount ?? 0);
      fetchStakeTxn(debouncedAmount ?? 0); // TODO move to one function
    }

    // if (isRefreshTxn) {
    //   fetchSwapTxn(debouncedAmount ?? 0);
    //   fetchStakeTxn(debouncedAmount ?? 0);
    // } TODO: add refresh logic
  }, [prevDebouncedAmount, isRefreshTxn, debouncedAmount, fetchSwapTxn, fetchStakeTxn]);

  const actionSummary = "x";

  const getAdressLookupTableAccounts = async (
    connection: Connection,
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(accountInfo.data),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  return {
    actionSummary,
  };
}

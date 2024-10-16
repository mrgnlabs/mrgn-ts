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
  TOKEN_2022_MINTS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { calculateSummary, getAdressLookupTableAccounts, getSimulationResult } from "../utils";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  LST_MINT,
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
          const { simulationResult } = await getSimulationResult({
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

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary && selectedBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          accountSummary: summary,
          actionTxns: actionTxns,
        });
      }
    },
    [selectedAccount, selectedBank, actionTxns]
  );

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
          platformFeeBps: 0, // TODO: fill
          slippageBps: slippageBps,
          swapMode: "ExactIn",
        });

        console.log("swapObject", swapObject);

        if (!swapObject) return;

        const jupiterQuoteApi = createJupiterApiClient();
        const blockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

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
          });

        console.log("swapInstruction", swapInstruction);

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

        let destinationTokenAccount;
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

        console.log("destinationTokenAccount", destinationTokenAccount);

        const [withdrawAuthority] = PublicKey.findProgramAddressSync(
          [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
          solanaStakePool.STAKE_POOL_PROGRAM_ID
        );
        console.log("withdrawAuthority", withdrawAuthority);

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

        console.log("stakeIx", stakeIx);

        const bundleTipIx = makeBundleTipIx(marginfiClient.wallet.publicKey);

        console.log("bundleTipIx", bundleTipIx);
        const stakeMessage = new TransactionMessage({
          payerKey: marginfiClient.wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: [bundleTipIx, ...stakeIx],
        });

        const stakeTx = new VersionedTransaction(stakeMessage.compileToV0Message([]));
        stakeTx.sign(signers);

        console.log("stakeTx", stakeTx);
        setActionTxns({
          actionTxn: swapTx,
          additionalTxns: [],
          // additionalTxns: [stakeTx],
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
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ...(actionTxns?.additionalTxns ?? []),
    ]);
  }, [actionTxns]);

  const actionSimulationSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSimulationSummary,
  };
}

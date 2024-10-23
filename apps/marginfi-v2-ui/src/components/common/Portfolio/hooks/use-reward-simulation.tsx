import React from "react";

import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { rewardsType } from "../types";
import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, TOKEN_2022_MINTS } from "@mrgnlabs/mrgn-utils";
import { EMISSION_MINT_INFO_MAP } from "~/components/desktop/AssetList/components";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  nativeToUi,
  numeralFormatter,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@mrgnlabs/mrgn-common";

type RewardSimulationProps = {
  simulationResult: rewardsType | null;
  actionTxn: VersionedTransaction | null;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];

  setSimulationResult: (result: rewardsType | null) => void;
  setActionTxn: (actionTxn: VersionedTransaction | null) => void;
  setErrorMessage: (error: ActionMethod | null) => void;
  setIsLoading: ({ state, type }: { state: boolean; type: string | null }) => void;
};

export const useRewardSimulation = ({
  simulationResult,
  actionTxn,
  marginfiClient,
  selectedAccount,
  extendedBankInfos,
  setSimulationResult,
  setActionTxn,
  setErrorMessage,
  setIsLoading,
}: RewardSimulationProps) => {
  const bankAddressesWithEmissions: PublicKey[] = React.useMemo(() => {
    if (!selectedAccount) return [];
    return [...EMISSION_MINT_INFO_MAP.keys()]
      .map((bankMintSymbol) => {
        const bankInfo = extendedBankInfos?.find((b) => b.address && b.meta.tokenSymbol === bankMintSymbol);
        if (bankInfo?.info.state.emissions.toString() === "1") return bankInfo?.address;
      })
      .filter((address) => address !== undefined) as PublicKey[];
  }, [selectedAccount, extendedBankInfos]); // TODO: confirm this is correct. I'm not sure, but some info.state.emissions are 0 and some are 1. For now i'm assuming that the banks with emissions are the ones with state.emissions = 1

  const handleSimulation = React.useCallback(async () => {
    if (!actionTxn || !marginfiClient || !selectedAccount) return; // TODO: handle

    // Structure to hold before and after amounts
    const beforeAmounts = new Map<PublicKey, { amount: string; tokenSymbol: string; mintDecimals: number }>();
    const afterAmounts = new Map<PublicKey, { amount: string; tokenSymbol: string; mintDecimals: number }>();

    const atas: PublicKey[] = [];

    for (let bankAddress of bankAddressesWithEmissions) {
      const bank = marginfiClient.getBankByPk(bankAddress);
      if (!bank) return; // TODO: handle

      const tokenMint = bank.emissionsMint;
      const tokenSymbol = bank.tokenSymbol ?? "";
      const mintDecimals = bank.mintDecimals;
      if (!tokenMint) return; // TODO: handle

      const programId = TOKEN_2022_MINTS.includes(tokenMint.toString()) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      const ata = getAssociatedTokenAddressSync(tokenMint, marginfiClient.wallet.publicKey, true, programId);
      if (!ata) return; // TODO: handle
      atas.push(ata);

      const originData = await marginfiClient.provider.connection.getAccountInfo(ata);
      if (!originData) return; // TODO: handle

      const beforeAmount = AccountLayout.decode(originData.data).amount.toString();
      beforeAmounts.set(bankAddress, { amount: beforeAmount, tokenSymbol, mintDecimals });
    }

    // Simulate transactions
    const previewAtas = await marginfiClient.simulateTransactions([actionTxn], atas);
    if (!previewAtas[0]) return; // TODO: handle

    // Map after amounts
    previewAtas.forEach((ata, index) => {
      if (!ata) return; // TODO: handle

      const afterAmount = AccountLayout.decode(ata).amount.toString();
      const bankAddress = bankAddressesWithEmissions[index];
      const beforeData = beforeAmounts.get(bankAddress);

      if (beforeData) {
        afterAmounts.set(bankAddress, {
          amount: afterAmount,
          tokenSymbol: beforeData.tokenSymbol,
          mintDecimals: beforeData.mintDecimals,
        });
      }
    });

    let rewards: rewardsType = {
      totalReward: 0,
      rewards: [],
    };

    beforeAmounts.forEach((beforeData, bankAddress) => {
      const afterData = afterAmounts.get(bankAddress);

      if (afterData) {
        const beforeAmount = nativeToUi(beforeData.amount, beforeData.mintDecimals);
        const afterAmount = nativeToUi(afterData.amount, afterData.mintDecimals);
        const rewardAmount = afterAmount - beforeAmount;

        if (rewardAmount > 0) {
          rewards.rewards.push({
            bank: beforeData.tokenSymbol,
            amount: rewardAmount < 0.01 ? "<0.01" : numeralFormatter(rewardAmount),
          });
          rewards.totalReward += rewardAmount;
        }
      }
    });

    // Set simulation result
    setSimulationResult(rewards);
  }, [actionTxn, bankAddressesWithEmissions, marginfiClient, selectedAccount, setSimulationResult]);

  const generateTxn = React.useCallback(async () => {
    const connection = marginfiClient?.provider.connection;
    if (!marginfiClient || !selectedAccount || !connection || !bankAddressesWithEmissions) return;

    const ixs: TransactionInstruction[] = [];
    const bundleTipIx = makeBundleTipIx(marginfiClient?.wallet.publicKey);
    const priorityFeeIx = selectedAccount?.makePriorityFeeIx(0); // TODO: set priorityfee
    const blockhash = (await connection.getLatestBlockhash()).blockhash;

    for (let bankAddress of bankAddressesWithEmissions) {
      const ix = await selectedAccount?.makeWithdrawEmissionsIx(bankAddress);
      if (!ix) continue;
      ixs.push(...ix.instructions);
    }

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [bundleTipIx, ...priorityFeeIx, ...ixs],
        payerKey: selectedAccount?.authority,
        recentBlockhash: blockhash,
      }).compileToV0Message()
    );

    setActionTxn(tx);
  }, [bankAddressesWithEmissions, marginfiClient, selectedAccount, setActionTxn]);

  React.useEffect(() => {
    generateTxn();
  }, [marginfiClient, bankAddressesWithEmissions, selectedAccount]);

  return {
    handleSimulation,
    generateTxn,
  };
};

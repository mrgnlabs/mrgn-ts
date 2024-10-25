import React from "react";

import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, TOKEN_2022_MINTS } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  nativeToUi,
  numeralFormatter,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@mrgnlabs/mrgn-common";

import { rewardsType } from "../types";

type RewardSimulationProps = {
  simulationResult: rewardsType | null;
  actionTxn: VersionedTransaction | null;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];

  setSimulationResult: (result: rewardsType | null) => void;
  setActionTxn: (actionTxn: VersionedTransaction | null) => void;
  setErrorMessage: (error: ActionMethod | null) => void;
};

export const useRewardSimulation = ({
  actionTxn,
  marginfiClient,
  selectedAccount,
  extendedBankInfos,
  setSimulationResult,
  setActionTxn,
}: RewardSimulationProps) => {
  const bankAddressesWithEmissions: PublicKey[] = React.useMemo(() => {
    if (!extendedBankInfos) return [];
    return extendedBankInfos.filter((bank) => bank.info.state.emissionsRate > 0).map((bank) => bank.meta.address);
  }, [extendedBankInfos, selectedAccount]);

  const handleSimulation = React.useCallback(async () => {
    try {
      if (!actionTxn || !marginfiClient || !selectedAccount) return;

      const beforeAmounts = new Map<PublicKey, { amount: string; tokenSymbol: string; mintDecimals: number }>();
      const afterAmounts = new Map<PublicKey, { amount: string; tokenSymbol: string; mintDecimals: number }>();

      const atas: PublicKey[] = [];

      for (let bankAddress of bankAddressesWithEmissions) {
        const bank = marginfiClient.getBankByPk(bankAddress);
        if (!bank) continue;

        const tokenMint = bank.emissionsMint;
        const tokenSymbol = bank.tokenSymbol ?? "";
        const mintDecimals = bank.mintDecimals;
        if (!tokenMint) continue;

        const programId = TOKEN_2022_MINTS.includes(tokenMint.toString()) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        const ata = getAssociatedTokenAddressSync(tokenMint, marginfiClient.wallet.publicKey, true, programId);
        if (!ata) continue;
        atas.push(ata);

        const originData = await marginfiClient.provider.connection.getAccountInfo(ata);
        if (!originData) continue;

        const beforeAmount = AccountLayout.decode(originData.data).amount.toString();
        beforeAmounts.set(bankAddress, { amount: beforeAmount, tokenSymbol, mintDecimals });
      }

      if (beforeAmounts.size === 0) {
        setSimulationResult({
          totalReward: 0,
          rewards: [],
        });
        return;
      }

      const previewAtas = await marginfiClient.simulateTransactions([actionTxn], atas);
      if (!previewAtas[0]) return;

      previewAtas.forEach((ata, index) => {
        if (!ata) return;

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

      setSimulationResult(rewards);
    } catch (error) {
      setSimulationResult({
        totalReward: 0,
        rewards: [],
      });
    }
  }, [actionTxn, bankAddressesWithEmissions, marginfiClient, selectedAccount, setSimulationResult]);

  const generateTxn = React.useCallback(async () => {
    try {
      const connection = marginfiClient?.provider.connection;
      if (!marginfiClient || !selectedAccount || !connection || !bankAddressesWithEmissions) return;

      const ixs: TransactionInstruction[] = [];
      const bundleTipIx = makeBundleTipIx(marginfiClient?.wallet.publicKey);
      const priorityFeeIx = selectedAccount?.makePriorityFeeIx(0); // TODO: set priorityfee
      const blockhash = (await connection.getLatestBlockhash()).blockhash;

      await Promise.all(
        bankAddressesWithEmissions.map(async (bankAddress) => {
          const ix = await selectedAccount?.makeWithdrawEmissionsIx(bankAddress);
          if (!ix) return;
          ixs.push(...ix.instructions);
        })
      );

      const tx = new VersionedTransaction(
        new TransactionMessage({
          instructions: [bundleTipIx, ...priorityFeeIx, ...ixs],
          payerKey: selectedAccount?.authority,
          recentBlockhash: blockhash,
        }).compileToV0Message()
      );

      setActionTxn(tx);
    } catch (error) {
      setActionTxn(null);
    }
  }, [bankAddressesWithEmissions, marginfiClient, selectedAccount, setActionTxn]);

  React.useEffect(() => {
    generateTxn();
  }, [marginfiClient, bankAddressesWithEmissions, selectedAccount]);

  return {
    handleSimulation,
    generateTxn,
    bankAddressesWithEmissions,
  };
};

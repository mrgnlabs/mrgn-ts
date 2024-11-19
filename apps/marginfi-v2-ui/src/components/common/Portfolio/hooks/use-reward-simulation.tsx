import React from "react";

import { PublicKey, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, captureSentryException, TOKEN_2022_MINTS } from "@mrgnlabs/mrgn-utils";
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
  setErrorMessage: (error: ActionMessageType | null) => void;
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
  }, [extendedBankInfos]);

  const handleSimulation = React.useCallback(async () => {
    try {
      if (!actionTxn || !marginfiClient || !selectedAccount) {
        setSimulationResult({
          rewards: [],
          totalReward: 0,
        });
        return;
      }

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
      console.error("Error simulating emissions transactions", error);
      captureSentryException(error, "Error simulating emissions transactions", {
        action: "rewardSimulation",
        walletAddress: selectedAccount?.address.toBase58(),
      });
      setSimulationResult({
        totalReward: 0,
        rewards: [],
      });
    }
  }, [actionTxn, bankAddressesWithEmissions, marginfiClient, selectedAccount, setSimulationResult]);

  const generateTxn = React.useCallback(async () => {
    try {
      if (!bankAddressesWithEmissions.length) return;
      const tx = await selectedAccount?.makeWithdrawEmissionsTx(bankAddressesWithEmissions);
      if (!tx) return;
      setActionTxn(tx);
    } catch (error) {
      setActionTxn(null);
    }
  }, [bankAddressesWithEmissions, selectedAccount, setActionTxn]);

  React.useEffect(() => {
    if (bankAddressesWithEmissions.length) {
      generateTxn();
    }
  }, [bankAddressesWithEmissions, generateTxn]);

  return {
    handleSimulation,
    generateTxn,
    bankAddressesWithEmissions,
  };
};

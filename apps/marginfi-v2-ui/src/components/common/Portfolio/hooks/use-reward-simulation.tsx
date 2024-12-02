import React from "react";

import { PublicKey, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  captureSentryException,
  EMISSION_MINT_INFO_MAP,
  TOKEN_2022_MINTS,
} from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  nativeToUi,
  numeralFormatter,
  SolanaTransaction,
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

  setSimulationResult: (result: rewardsType) => void;
  setActionTxn: (actionTxn: VersionedTransaction | null) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
};

export const useRewardSimulation = ({
  marginfiClient,
  selectedAccount,
  extendedBankInfos,
  setSimulationResult,
}: RewardSimulationProps) => {
  const generateTxn = async (
    banksWithEmissions: ExtendedBankInfo[],
    selectedAccount: MarginfiAccountWrapper
  ): Promise<SolanaTransaction | undefined> => {
    try {
      const bankAddressesWithEmissions = banksWithEmissions.map((bank) => bank.meta.address);
      const tx = await selectedAccount?.makeWithdrawEmissionsTx(bankAddressesWithEmissions);
      if (!tx) return;
      return tx;
    } catch (error) {
      console.error("Error generating emissions transaction", error);
    }
  };

  const handleSimulation = React.useCallback(async () => {
    try {
      if (!marginfiClient || !selectedAccount) {
        setSimulationResult({
          state: "ERROR",
          tooltipContent: "",
          rewards: {
            rewards: [],
            totalReward: 0,
          },
        });
        console.log("hierzo");
        return;
      } // TOOD: update this state

      const banksWithEmissions = extendedBankInfos.filter((bank) => bank.info.state.emissionsRate > 0);
      if (!banksWithEmissions.length) {
        setSimulationResult({
          state: "NO_REWARDS",
          tooltipContent: "There are currently no banks that are outputting rewards.",
          rewards: {
            totalReward: 0,
            rewards: [],
          },
        });
        console.log("hierzo 2");

        return;
      }

      const txns = await generateTxn(banksWithEmissions, selectedAccount);

      if (!txns) {
        setSimulationResult({
          state: "NO_REWARDS",
          tooltipContent: `You do not have any outstanding rewards. Deposit into a bank with emissions to earn additional rewards on top of yield. Banks with emissions: ${[
            ...banksWithEmissions.map((bank) => bank.meta.tokenSymbol),
          ].join(", ")}`,
          rewards: {
            totalReward: 0,
            rewards: [],
          },
        });
        console.log("hierzo 3");
        return;
      }

      const beforeAmounts = new Map<PublicKey, { amount: string; tokenSymbol: string; mintDecimals: number }>();
      const afterAmounts = new Map<PublicKey, { amount: string; tokenSymbol: string; mintDecimals: number }>();

      const atas: PublicKey[] = [];

      for (let bank of banksWithEmissions) {
        const _bank = marginfiClient.getBankByPk(bank.meta.address);
        if (!_bank || !bank) continue;

        const tokenMint = _bank.emissionsMint;
        const tokenSymbol = _bank.tokenSymbol ?? "";
        const mintDecimals = _bank.mintDecimals;
        if (!tokenMint) continue;

        const programId = TOKEN_2022_MINTS.includes(tokenMint.toString()) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        const ata = getAssociatedTokenAddressSync(tokenMint, marginfiClient.wallet.publicKey, true, programId);
        if (!ata) continue;
        atas.push(ata);

        const originData = await marginfiClient.provider.connection.getAccountInfo(ata);
        if (!originData) continue;

        const beforeAmount = AccountLayout.decode(originData.data).amount.toString();
        beforeAmounts.set(bank.meta.address, { amount: beforeAmount, tokenSymbol, mintDecimals });
      }

      if (beforeAmounts.size === 0) {
        setSimulationResult({
          state: "NO_REWARDS",
          tooltipContent: "",
          rewards: {
            totalReward: 0,
            rewards: [],
          },
        });
        return;
      }

      const previewAtas = await marginfiClient.simulateTransactions([txns], atas);
      if (!previewAtas[0]) return;

      previewAtas.forEach((ata, index) => {
        if (!ata) return;

        const afterAmount = AccountLayout.decode(ata).amount.toString();
        const bankAddress = banksWithEmissions[index].meta.address;
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
        state: "REWARDS_FETCHED",
        tooltipContent: "",
        rewards: {
          totalReward: 0,
          rewards: [],
        },
      };

      beforeAmounts.forEach((beforeData, bankAddress) => {
        const afterData = afterAmounts.get(bankAddress);

        if (afterData) {
          const beforeAmount = nativeToUi(beforeData.amount, beforeData.mintDecimals);
          const afterAmount = nativeToUi(afterData.amount, afterData.mintDecimals);
          const rewardAmount = afterAmount - beforeAmount;

          if (rewardAmount > 0) {
            rewards.rewards.rewards.push({
              bank: beforeData.tokenSymbol,
              amount: rewardAmount < 0.01 ? "<0.01" : numeralFormatter(rewardAmount),
            }); // TODO: fix this rewards.rewards.rewards ... shit
            rewards.rewards.totalReward += rewardAmount;
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
        state: "NO_REWARDS",
        tooltipContent: "",
        rewards: {
          totalReward: 0,
          rewards: [],
        },
      });
    }
  }, [extendedBankInfos, marginfiClient, selectedAccount, setSimulationResult]);

  return {
    handleSimulation,
  };
};

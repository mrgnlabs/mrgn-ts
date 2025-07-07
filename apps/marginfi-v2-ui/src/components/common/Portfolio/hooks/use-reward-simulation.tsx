import React from "react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, captureSentryException } from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { nativeToUi, numeralFormatter, SolanaTransaction } from "@mrgnlabs/mrgn-common";

import { RewardsType } from "../types";
import { fetchAfterStateEmissions, fetchBeforeStateEmissions, generateWithdrawEmissionsTxn } from "../utils";

type RewardSimulationProps = {
  simulationResult: RewardsType | null;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];

  setSimulationResult: (result: RewardsType) => void;
  setActionTxn: (actionTxn: SolanaTransaction) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
};

export const useRewardSimulation = ({
  marginfiClient,
  selectedAccount,
  extendedBankInfos,
  setSimulationResult,
  setActionTxn,
}: RewardSimulationProps) => {
  const handleSimulation = React.useCallback(async () => {
    try {
      if (!marginfiClient || !selectedAccount) {
        throw new Error("No marginfi client or selected account");
      }

      const banksWithEmissions = extendedBankInfos.filter(
        (bank) => bank.info.state.emissionsRate > 0 && bank.info.rawBank.emissionsRemaining.toNumber() > 0
      );

      if (!banksWithEmissions.length) {
        setSimulationResult({
          state: "NO_REWARDS",
          tooltipContent: "There are currently no banks that are outputting rewards.",
          rewards: [],
          totalRewardAmount: 0,
        });
        return;
      }

      const NO_REWARDS_USER: RewardsType = {
        state: "NO_REWARDS",
        tooltipContent: `You do not have any outstanding rewards. Deposit into a bank with rewards to earn additional rewards on top of yield. Banks with rewards: ${[
          ...banksWithEmissions.map((bank) => bank.meta.tokenSymbol),
        ].join(", ")}`,
        rewards: [],
        totalRewardAmount: 0,
      };

      const activeBanksWithemissions = banksWithEmissions.filter(
        (bank) => bank.isActive && bank.position.isLending
      ) as ActiveBankInfo[];

      const txns = await generateWithdrawEmissionsTxn(activeBanksWithemissions, selectedAccount);

      if (!txns) {
        setSimulationResult(NO_REWARDS_USER);
        return;
      }

      const { atas, beforeAmounts } = await fetchBeforeStateEmissions(marginfiClient, activeBanksWithemissions);

      let previewAtas: (Buffer | null)[] = [];
      try {
        previewAtas = await marginfiClient.simulateTransactions([txns], atas);
      } catch (error) {
        console.log("error", error);
        setSimulationResult(NO_REWARDS_USER);
        return;
      }

      if (!previewAtas[0]) {
        setSimulationResult(NO_REWARDS_USER);
        return;
      }

      const afterAmounts = fetchAfterStateEmissions(previewAtas, activeBanksWithemissions, beforeAmounts);

      let rewards: RewardsType = {
        state: "REWARDS_FETCHED",
        tooltipContent: "",
        rewards: [],
        totalRewardAmount: 0,
      };

      beforeAmounts.forEach((beforeData, bankAddress) => {
        const afterData = afterAmounts.get(bankAddress);

        if (afterData) {
          const beforeAmountUi = beforeData.amount;
          const afterAmountUi = nativeToUi(afterData.amount, afterData.mintDecimals);
          const rewardAmount = afterAmountUi - beforeAmountUi;

          if (rewardAmount > 0) {
            rewards.rewards.push({
              bank: extendedBankInfos.find((bank) => bank.meta.address.toString() === bankAddress.toString())!,
              amount: rewardAmount,
            });
            rewards.tooltipContent = "You have earned rewards, press 'collect rewards' to claim.";
            rewards.totalRewardAmount += rewardAmount;
          }
        }
      });

      if (rewards.rewards.length === 0) {
        rewards.state = "EARNING_REWARDS";
        rewards.tooltipContent = "You are currently earning rewards, come back later to collect.";
      }

      setSimulationResult(rewards);
      setActionTxn(txns);
    } catch (error) {
      console.error("Error simulating emissions transactions", error);
      captureSentryException(error, "Error simulating emissions transactions", {
        action: "rewardSimulation",
        walletAddress: selectedAccount?.address.toBase58(),
      });
      setSimulationResult({
        state: "ERROR",
        tooltipContent: "Error fetching rewards",
        rewards: [],
        totalRewardAmount: 0,
      });
    }
  }, [extendedBankInfos, marginfiClient, selectedAccount, setActionTxn, setSimulationResult]);

  return {
    handleSimulation,
  };
};

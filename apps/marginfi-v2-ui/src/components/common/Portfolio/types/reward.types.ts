import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";

export type RewardsType = {
  state: "NOT_FETCHED" | "NO_REWARDS" | "EARNING_REWARDS" | "REWARDS_FETCHED" | "ERROR";
  tooltipContent: string;
  totalRewardAmount: number;
  rewards: { bank: ExtendedBankInfo; amount: number }[];
};

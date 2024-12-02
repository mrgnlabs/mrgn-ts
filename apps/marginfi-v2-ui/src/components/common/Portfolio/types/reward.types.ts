export type RewardsType = {
  state: "NOT_FETCHED" | "NO_REWARDS" | "REWARDS_FETCHED" | "ERROR";
  tooltipContent: string;
  totalRewardAmount: number;
  rewards: { bank: string; amount: string }[];
};

export type rewardsType = {
  state: "NOT_FETCHED" | "NO_REWARDS" | "REWARDS_FETCHED" | "ERROR";
  tooltipContent: string;
  rewards: {
    totalReward: number;
    rewards: { bank: string; amount: string }[];
  };
};

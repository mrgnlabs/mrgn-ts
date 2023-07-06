export type UserData = {
  userTotalPoints?: number;
  userLendingPoints?: number;
  userBorrowingPoints?: number;
  userReferralPoints?: number;
  userReferralLink?: string;
  userRank?: number;
};

export type LeaderboardRow = {
  id: string;
  total_activity_deposit_points: number;
  total_activity_borrow_points: number;
  total_referral_deposit_points: number;
  total_referral_borrow_points: number;
  total_deposit_points: number;
  total_borrow_points: number;
  socialPoints: number;
  rank?: number;
};

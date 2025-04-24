type BankRate = {
  borrow_rate_pct: string;
  deposit_rate_pct: string;
  time: string;
  total_borrows: string;
  total_deposits: string;
};

type BankRatesResponse = {
  data: BankRate[];
};

type DailyAverages = {
  timestamp: string;
  borrowRate: number;
  depositRate: number;
  totalBorrows: number;
  totalDeposits: number;
};

type UseBankRatesReturn = {
  data: DailyAverages[] | null;
  error: Error | null;
  isLoading: boolean;
};

export type { BankRate, BankRatesResponse, DailyAverages, UseBankRatesReturn };

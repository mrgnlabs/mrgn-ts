type BankChartData = {
  borrow_rate_pct: string;
  deposit_rate_pct: string;
  time: string;
  total_borrows: string;
  total_deposits: string;
};

type BankHistoricalDataResponse = {
  data: BankChartData[];
};

type BankChartDataDailyAverages = {
  timestamp: string;
  borrowRate: number;
  depositRate: number;
  totalBorrows: number;
  totalDeposits: number;
};

type UseBankRatesReturn = {
  data: BankChartDataDailyAverages[] | null;
  error: Error | null;
  isLoading: boolean;
};

export type { BankChartData, BankHistoricalDataResponse, BankChartDataDailyAverages, UseBankRatesReturn };

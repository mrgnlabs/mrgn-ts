type BankChartData = {
  borrowRate: number;
  depositRate: number;
  timestamp: string;
  totalBorrows: number;
  totalDeposits: number;
  totalBorrowsUsd?: number;
  totalDepositsUsd?: number;
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
  totalBorrowsUsd?: number;
  totalDepositsUsd?: number;
};

type UseBankRatesReturn = {
  data: BankChartDataDailyAverages[] | null;
  error: Error | null;
  isLoading: boolean;
};

export type { BankChartData, BankHistoricalDataResponse, BankChartDataDailyAverages, UseBankRatesReturn };

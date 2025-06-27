type BankChartData = {
  borrowRate: number;
  depositRate: number;
  timestamp: string;
  totalBorrows: number;
  totalDeposits: number;
  totalBorrowsUsd?: number;
  totalDepositsUsd?: number;
  usdPrice: number;
  utilization: number;
  optimalUtilizationRate: number;
  baseRate: number;
  plateauInterestRate: number;
  maxInterestRate: number;
  insuranceIrFee: number;
  protocolIrFee: number;
  programFeeRate: number;
  insuranceFeeFixedApr: number;
  protocolFixedFeeApr: number;
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
  usdPrice: number;
  utilization: number;
  optimalUtilizationRate: number;
  baseRate: number;
  plateauInterestRate: number;
  maxInterestRate: number;
  insuranceIrFee: number;
  protocolIrFee: number;
  programFeeRate: number;
  insuranceFeeFixedApr: number;
  protocolFixedFeeApr: number;
};

type UseBankRatesReturn = {
  data: BankChartDataDailyAverages[] | null;
  error: Error | null;
  isLoading: boolean;
};

export type { BankChartData, BankHistoricalDataResponse, BankChartDataDailyAverages, UseBankRatesReturn };

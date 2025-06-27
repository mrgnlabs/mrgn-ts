export type BankChartData = {
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

export type BankChartDataDailyAverages = BankChartData & {
  timestamp: string;
};

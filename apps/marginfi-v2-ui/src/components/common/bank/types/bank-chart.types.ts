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

export type BankHistoricalDataResponse = {
  data: BankChartData[];
};

export type BankChartDataDailyAverages = BankChartData & {
  timestamp: string;
};

export type UseBankRatesReturn = {
  data: BankChartDataDailyAverages[] | null;
  error: Error | null;
  isLoading: boolean;
};

export const chartColors = {
  primary: "hsl(var(--mrgn-success))",
  secondary: "hsl(var(--mrgn-warning))",
} as const;

export const chartConfigs = {
  rates: {
    depositRate: {
      label: "Deposit Rate",
      color: chartColors.primary,
    },
    borrowRate: {
      label: "Borrow Rate",
      color: chartColors.secondary,
    },
  },
  interestCurve: {
    borrowAPY: {
      label: "Borrow APY",
      color: chartColors.secondary,
    },
    supplyAPY: {
      label: "Supply APY",
      color: chartColors.primary,
    },
  },
  tvl: {
    displayTotalDeposits: {
      label: "Total Deposits",
      color: chartColors.primary,
    },
    displayTotalBorrows: {
      label: "Total Borrows",
      color: chartColors.secondary,
    },
  },
};

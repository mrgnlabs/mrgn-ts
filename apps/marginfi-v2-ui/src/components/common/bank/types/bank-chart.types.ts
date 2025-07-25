import { historicBankChartData } from "@mrgnlabs/mrgn-state";

export type BankChartData = historicBankChartData & {
  totalBorrowsUsd?: number;
  totalDepositsUsd?: number;
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

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

type UseBankRatesReturn = {
  data: BankRate[] | null;
  error: Error | null;
  isLoading: boolean;
};

export type { BankRate, BankRatesResponse, UseBankRatesReturn };

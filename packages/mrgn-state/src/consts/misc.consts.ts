const VOLATILITY_FACTOR = 0.975;

const DEFAULT_ACCOUNT_SUMMARY = {
  healthFactor: 0,
  balanceEquity: 0,
  lendingAmountEquity: 0,
  borrowingAmountEquity: 0,
  lendingAmountMaintenance: 0,
  borrowingAmountMaintenance: 0,
  apy: 0,
  positions: [],
  signedFreeCollateral: 0,
  healthSimFailed: false,
};

export { DEFAULT_ACCOUNT_SUMMARY, VOLATILITY_FACTOR };

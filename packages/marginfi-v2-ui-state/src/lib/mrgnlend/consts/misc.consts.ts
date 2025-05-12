import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";

const VOLATILITY_FACTOR = 0.975;

const DEFAULT_ACCOUNT_SUMMARY = {
  healthFactor: 0,
  balance: 0,
  lendingAmount: 0,
  borrowingAmount: 0,
  balanceUnbiased: 0,
  lendingAmountUnbiased: 0,
  borrowingAmountUnbiased: 0,
  lendingAmountWithBiasAndWeighted: 0,
  borrowingAmountWithBiasAndWeighted: 0,
  apy: 0,
  positions: [],
  outstandingUxpEmissions: 0,
  signedFreeCollateral: 0,
};

const EMODE_TAG_LABELS: Record<EmodeTag, string> = {
  [EmodeTag.UNSET]: "Unset",
  [EmodeTag.SOL]: "sol",
  [EmodeTag.LST]: "lst",
  [EmodeTag.STABLE]: "stablecoins",
};

export { DEFAULT_ACCOUNT_SUMMARY, VOLATILITY_FACTOR, EMODE_TAG_LABELS };

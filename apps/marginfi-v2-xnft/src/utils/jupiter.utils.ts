import BN from "bn.js";
import JSBI from "jsbi";
import Decimal from "decimal.js";

export function fromLamports(lamportsAmount?: JSBI | BN | number, decimals?: number, rate: number = 1.0): number {
  if (!lamportsAmount) {
    return 0;
  }

  const amount = BN.isBN(lamportsAmount) ? lamportsAmount : lamportsAmount;

  const base = 10;
  const precision = new Decimal(base).pow(decimals ?? 6);

  return new Decimal(amount.toString()).div(precision).mul(rate).toNumber();
}

export function toLamports(lamportsAmount: JSBI | BN | number, decimals: number): number {
  let amount = BN.isBN(lamportsAmount) ? lamportsAmount.toNumber() : Number(lamportsAmount);

  if (Number.isNaN(amount)) {
    amount = 0;
  }
  const precision = Math.pow(10, decimals);

  return Math.floor(amount * precision);
}

const userLocale =
  typeof window !== "undefined"
    ? navigator.languages && navigator.languages.length
      ? navigator.languages[0]
      : navigator.language
    : "en-US";

export const numberFormatter = new Intl.NumberFormat(userLocale, {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 9,
});

export const formatNumber = {
  format: (val?: number, precision?: number) => {
    if (!val && val !== 0) {
      return "--";
    }

    if (precision !== undefined) {
      return val.toFixed(precision);
    } else {
      return numberFormatter.format(val);
    }
  },
};

export const detectedSeparator = formatNumber.format(1.1).substring(1, 2);

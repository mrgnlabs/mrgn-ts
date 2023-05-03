import numeral from "numeral";

class CustomNumberFormat extends Intl.NumberFormat {
  constructor(locale: string | string[] | undefined, options: Intl.NumberFormatOptions | undefined) {
    super(locale, options);
  }

  format(value: number | bigint) {
    if (value === 0) {
      return "-";
    } else {
      return super.format(value);
    }
  }
}

export const groupedNumberFormatter = new CustomNumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const numeralFormatter = (value: number) => numeral(value).format("0.00a");

export const groupedNumberFormatterDyn = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "auto",
});

export const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const percentFormatterDyn = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

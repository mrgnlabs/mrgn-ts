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

const groupedNumberFormatter = new CustomNumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numeralFormatter = (value: number) => {
  if (value < 0.01) {
    return "0";
  } else {
    return numeral(value).format("0.00a");
  }
};

const groupedNumberFormatterDyn = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "auto",
});

const usdFormatterDyn = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  signDisplay: "auto",
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatterDyn = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const clampedNumeralFormatter = (value: number) => {
  if (value === 0) {
    return "0";
  } else if (value < 0.01) {
    return "< 0.01";
  } else {
    return numeral(value).format("0.00a");
  }
};

const tokenPriceFormatter = (price: number) => {
  const reformatNum = Number(price.toFixed(20));

  if (reformatNum < 0.00000001) {
    return price.toExponential(2);
  }

  const { minFractionDigits, maxFractionDigits } =
    reformatNum > 1
      ? { minFractionDigits: 0, maxFractionDigits: 2 }
      : reformatNum > 0.000001
      ? { minFractionDigits: 2, maxFractionDigits: 7 }
      : { minFractionDigits: 7, maxFractionDigits: 10 };

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
    signDisplay: "auto",
  });

  return formatter.format(price);
};

export {
  CustomNumberFormat,
  groupedNumberFormatter,
  groupedNumberFormatterDyn,
  numeralFormatter,
  clampedNumeralFormatter,
  percentFormatter,
  percentFormatterDyn,
  usdFormatter,
  usdFormatterDyn,
  tokenPriceFormatter,
};

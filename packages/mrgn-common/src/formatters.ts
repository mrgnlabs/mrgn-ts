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

export {
  CustomNumberFormat,
  groupedNumberFormatter,
  groupedNumberFormatterDyn,
  numeralFormatter,
  percentFormatter,
  percentFormatterDyn,
  usdFormatter,
  usdFormatterDyn,
};

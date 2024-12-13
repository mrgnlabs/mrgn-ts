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
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numeralFormatter = (value: number) => {
  if (value < 0.01) {
    return "0";
  } else {
    return numeral(value).format("0.00a");
  }
};

interface dynamicNumeralFormatterOptions {
  minDisplay?: number;
  tokenPrice?: number;
  forceDecimals?: boolean;
  maxDisplay?: number;
}

export const dynamicNumeralFormatter = (value: number, options: dynamicNumeralFormatterOptions = {}) => {
  const { minDisplay = 0.00001, maxDisplay = 10000, tokenPrice, forceDecimals } = options;

  if (value === 0) return "0";

  if (Math.abs(value) < minDisplay) {
    return `<${minDisplay}`;
  }

  if (Math.abs(value) > 10000) {
    return numeral(value).format(forceDecimals ? "0,0.00a" : "0,0.[00]a");
  }

  if (Math.abs(value) >= 0.01) {
    return numeral(value).format(forceDecimals && Math.abs(value) > 0.99 ? "0,0.00a" : "0,0.[0000]a");
  }
  if (Math.abs(value) >= minDisplay) {
    const decimalPlaces = Math.max(0, Math.ceil(-Math.log10(minDisplay)));
    return numeral(value).format(`0,0.[${"0".repeat(decimalPlaces)}]`);
  }

  if (tokenPrice) {
    const minUsdDisplay = 0.00000001;
    const smallestUnit = minUsdDisplay / tokenPrice;

    const requiredDecimals = Math.max(2, Math.ceil(-Math.log10(smallestUnit)) + 1);

    const decimalPlaces = Math.min(requiredDecimals, 8);

    return value.toFixed(decimalPlaces).replace(/\.?0+$/, "");
  }

  return "0";
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

const percentFormatterMod = (
  value: number,
  opts: { minFractionDigits: number; maxFractionDigits: number } = { minFractionDigits: 2, maxFractionDigits: 2 }
) => {
  const percentFormatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: opts.minFractionDigits,
    maximumFractionDigits: opts.maxFractionDigits,
  });

  if (value === 0) {
    return "0";
  } else {
    return percentFormatter.format(value);
  }
};

const clampedNumeralFormatter = (value: number) => {
  if (value === 0) {
    return "0";
  } else if (value < 0.01) {
    return "< 0.01";
  } else {
    return numeral(value).format("0.00a");
  }
};

const tokenPriceFormatter = (price: number, style: "currency" | "decimal" = "currency") => {
  if (price === 0) {
    return 0;
  }
  const reformatNum = Number(price.toFixed(20));

  if (price === 0) {
    return 0;
  }

  if (reformatNum < 0.00000001) {
    return price.toExponential(2);
  }

  const { minFractionDigits, maxFractionDigits } =
    reformatNum > 1
      ? { minFractionDigits: 2, maxFractionDigits: 2 }
      : reformatNum > 0.000001
      ? { minFractionDigits: 2, maxFractionDigits: 7 }
      : { minFractionDigits: 7, maxFractionDigits: 10 };

  const formatter = new Intl.NumberFormat("en-US", {
    style: style,
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
  percentFormatterMod,
  usdFormatter,
  usdFormatterDyn,
  tokenPriceFormatter,
};

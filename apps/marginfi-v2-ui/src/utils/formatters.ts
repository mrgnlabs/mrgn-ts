export const groupedNumberFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  signDisplay: "exceptZero",
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

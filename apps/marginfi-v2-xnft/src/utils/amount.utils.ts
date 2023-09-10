export const abbreviateNumber = (amount: number): string => {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "B" },
    { value: 1e12, symbol: " Tril" },
    { value: 1e15, symbol: " Qua" },
    { value: 1e18, symbol: " Gui" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return amount >= item.value;
    });
  return item ? (amount / item.value).toFixed(2).replace(rx, "$1") + item.symbol : "0";
};

export function countDecimalPlaces(num: number): number {
  const decimalPart = (num.toString().split(".")[1] || "").length;
  return decimalPart;
}

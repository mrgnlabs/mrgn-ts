import BigNumber from "bignumber.js";

const add = (a: string | number | BigNumber, b: string | number | BigNumber) => {
  const ba = BigNumber.isBigNumber(a) ? a : BigNumber(a);
  const bb = BigNumber.isBigNumber(b) ? b : BigNumber(b);
  return ba.plus(bb);
};

export { add };

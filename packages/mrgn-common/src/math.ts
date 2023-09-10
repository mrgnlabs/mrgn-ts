function floor(value: number, decimals: number): number {
  return Math.floor(value * 10 ** decimals) / 10 ** decimals;
}

function ceil(value: number, decimals: number): number {
  return Math.ceil(value * 10 ** decimals) / 10 ** decimals;
}

export { ceil, floor };

import BigNumber from "bignumber.js";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient();

  let tvl = BigNumber(0);
  let banks: {token: string | undefined, tvl: BigNumber}[] = []
  for (const [bankAddress, bank] of client.banks) {
    const oraclePrice = client.getOraclePriceByBank(bankAddress);
    if (!oraclePrice) {
      throw new Error("No oracle price");
    }
    const bankTvl = bank.computeTvl(oraclePrice);
    tvl = tvl.plus(bankTvl);
    banks.push({token: bank.tokenSymbol ?? bankAddress, tvl: bankTvl});
  }

  const sortedBanks = banks.sort((a, b) => b.tvl.minus(a.tvl).toNumber());
  for (const bank of sortedBanks) {
    console.log(`${bank.token}: ${numeralFormatter(bank.tvl.toNumber())}`);
  }

  console.log(`\nTotal TVL: ${numeralFormatter(tvl.toNumber())}`);
}

main();

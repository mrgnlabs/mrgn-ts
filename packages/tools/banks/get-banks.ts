import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata } from "../lib/utils";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";

dotenv.config();

async function main() {
  const argv = getDefaultYargsOptions()
    // option: filter by group
    .option("group", {
      alias: "g",
      type: "string",
      description: "Group to filter banks by",
      default: "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8",
    })
    // option: filter by min USD value
    // .option("min", {
    //   alias: "m",
    //   type: "number",
    //   description: "Filter by minimum value (USD)",
    //   default: 0.1,
    // })
    // option: filter by max USD value
    // .option("max", {
    //   alias: "M",
    //   type: "number",
    //   description: "Filter by maximum value (USD)",
    //   default: 1_000_000_000,
    // })
    // option: limit
    // .option("limit", {
    //   alias: "l",
    //   type: "number",
    //   description: "Maximum number of banks to return",
    // })
    .parseSync();
  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadata = await getBankMetadata();
  const bankAddresses = bankMetadata.map((meta) => new PublicKey(meta.bankAddress));

  const banks = await program.account.bank.fetchMultiple(bankAddresses);

  const banksData = await banks
    .map(async (acc, index) => {
      if (!acc) return null;

      // Filter by group
      if (argv.group && acc.group.toString() !== argv.group) return null;

      const bankPubkey = bankAddresses[index];
      const bankMeta = bankMetadata[index];

      // Fetch pricing data
      // const oraclePriceResponse = await fetch(`https://app.marginfi.com/api/oracle/price?banks=${bankPubkey.toString()}`, {
      //   headers: {
      //     Referer: "https://app.marginfi.com",
      //   },
      // });
      // const oraclePriceData = await oraclePriceResponse.json();
      // const totalAssetShares = wrappedI80F48toBigNumber(acc.totalAssetShares);
      // const assetShareValue = wrappedI80F48toBigNumber(acc.assetShareValue);
      // const scaleFactor = Math.pow(10, acc.mintDecimals);
      // const totalAssetQuantity = totalAssetShares.times(assetShareValue).div(scaleFactor);
      // const assetValue = totalAssetQuantity.times(oraclePriceData[0].priceRealtime.price);

      // Filter by min USD value
      // if (argv.minValue && assetValue.lt(argv.min)) return null;

      // Filter by max USD value
      // if (argv.maxValue && assetValue.gt(argv.max)) return null;

      return {
        Symbol: bankMeta?.tokenSymbol,
        Address: bankPubkey.toString(),
        Group: acc.group.toString(),
        Mint: acc.mint.toString(),
        // "Balance (USD)": `$${formatNumber(assetValue.toNumber())}`,
      };
    })
    .filter(Boolean)
    // .sort((a, b) => a.Symbol.localeCompare(b.Symbol))
    // .slice(0, argv.limit);

  console.log(`\r\nFound ${banksData.length} banks in group ${argv.group}`);

  console.table(banksData);
}

main().catch((err) => {
  console.error(err);
});

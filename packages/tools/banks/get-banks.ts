import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata } from "../lib/utils";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";

dotenv.config();

async function main() {
  const argv = getDefaultYargsOptions()
    // sort by asset value
    .option("sort-by-asset-value", {
      alias: "sav",
      type: "string",
      description: "Sort by asset value",
      choices: ["greatest", "least"],
      default: "greatest",
    })
    .option("sort-by-symbol", {
      alias: "ss",
      type: "string",
      description: "Sort by symbol",
      choices: ["ascending", "descending"],
      default: "ascending",
    })
    .parseSync();
  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadata = await getBankMetadata();
  const bankAddresses = bankMetadata.map((meta) => new PublicKey(meta.bankAddress));

  const banks = await program.account.bank.fetchMultiple(bankAddresses);

  const banksData = await Promise.all(banks
    .map(async (acc, index) => {
      if (!acc) return null;
      if (acc.group.toString() !== argv.group) return null;

      const bankPubkey = bankAddresses[index];
      const bankMeta = bankMetadata[index];

      // get pricing data
      const oraclePriceResponse = await fetch(`https://app.marginfi.com/api/oracle/price?banks=${bankPubkey.toString()}`, {
        headers: {
          Referer: "https://app.marginfi.com",
        },
      });
      const oraclePriceData = await oraclePriceResponse.json();

      const scaleFactor = Math.pow(10, acc.mintDecimals);
      const totalAssetShares = wrappedI80F48toBigNumber(acc.totalAssetShares);
      const assetShareValue = wrappedI80F48toBigNumber(acc.assetShareValue);

      const totalAssetQuantity = totalAssetShares.times(assetShareValue).div(scaleFactor);
      const assetValue = totalAssetQuantity.times(oraclePriceData[0].priceRealtime.price)

      return {
        Symbol: bankMeta?.tokenSymbol,
        Address: bankPubkey.toString(),
        Mint: acc.mint.toString(),
        Type: acc.config.riskTier.isolated ? "Isolated" : "Collateral",
        "Asset Value (USD)": `$${formatNumber(assetValue.toNumber())}`,
      };
    })
    .filter(Boolean));

    const sortFunctions = {
      assetValue: (a: any, b: any) => {
        const valueA = Number(a["Asset Value (USD)"].replace(/[$,]/g, ''));
        const valueB = Number(b["Asset Value (USD)"].replace(/[$,]/g, ''));
        return valueB - valueA;
      },
      symbol: (a: any, b: any) => a.Symbol.localeCompare(b.Symbol),
    };

  const sortedBanksData = [...banksData];
  if (argv.sortByAssetValue) {
    argv.sortByAssetValue === "greatest" 
      ? sortedBanksData.sort(sortFunctions.assetValue)
      : sortedBanksData.sort((a, b) => sortFunctions.assetValue(b, a));
  } else if (argv.sortBySymbol) {
    sortedBanksData.sort(sortFunctions.symbol);
  }

  console.log(`\r\nFound ${sortedBanksData.length} banks in group ${argv.group}`);
  console.table(sortedBanksData);
}

main().catch((err) => {
  console.error(err);
});

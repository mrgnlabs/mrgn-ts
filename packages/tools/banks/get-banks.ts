import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata } from "../lib/utils";

dotenv.config();

async function main() {
  const argv = getDefaultYargsOptions()
    .option("sort-by-asset-value", {
      alias: "sav",
      type: "string",
      description: "Sort by asset value",
      choices: ["asc", "desc"],
    })
    .parseSync();
  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadata = await getBankMetadata();
  const bankAddresses = bankMetadata.map((meta) => new PublicKey(meta.bankAddress));

  const banks = await program.account.bank.fetchMultiple(bankAddresses);

  // Fetch all oracle prices in a single request
  const oraclePriceResponse = await fetch(
    `https://app.marginfi.com/api/oracle/price?banks=${bankAddresses.map((pk) => pk.toString()).join(",")}`,
    {
      headers: {
        Referer: "https://app.marginfi.com",
      },
    }
  );
  const oraclePriceData = (await oraclePriceResponse.json()) as any[];

  // Create a map of bank address to price data for easy lookup
  const priceMap = new Map();
  oraclePriceData.forEach((price, index) => {
    priceMap.set(bankAddresses[index].toString(), price);
  });

  const banksData = banks.map((item, index) => {
    const bankPubkey = bankAddresses[index];
    const bankMeta = bankMetadata[index];
    const bankAddress = bankPubkey.toString();
    const price = priceMap.get(bankAddress);

    return {
      Symbol: bankMeta?.tokenSymbol,
      Address: bankAddress,
      Mint: item.mint.toString(),
      Type: item.config.riskTier.isolated ? "Isolated" : "Collateral",
      "Asset Value (USD)": `$${formatNumber(Number(price.priceRealtime.price))}`,
    };
  });

  const sortFunctions = {
    assetValue: (a: any, b: any) => {
      const valueA = Number(a["Asset Value (USD)"].replace(/[$,]/g, ""));
      const valueB = Number(b["Asset Value (USD)"].replace(/[$,]/g, ""));
      return valueB - valueA;
    },
    symbol: (a: any, b: any) => {
      const metaA = bankMetadata.find((meta) => meta.bankAddress === a.Address);
      const metaB = bankMetadata.find((meta) => meta.bankAddress === b.Address);
      return metaA.tokenSymbol.localeCompare(metaB.tokenSymbol);
    },
  };

  const sortedBanksData = [...banksData];

  if (argv.sortByAssetValue) {
    // Sort by asset value when --sav is provided
    argv.sortByAssetValue === "desc"
      ? sortedBanksData.sort(sortFunctions.assetValue)
      : sortedBanksData.sort((a, b) => sortFunctions.assetValue(b, a));
  } else {
    // Default to sorting by symbol when --sav is not provided
    sortedBanksData.sort(sortFunctions.symbol);
  }

  console.log(`\r\nFound ${sortedBanksData.length} banks in group ${argv.group}`);
  console.table(sortedBanksData);
}

main().catch((err) => {
  console.error(err);
});

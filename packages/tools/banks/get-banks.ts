import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata } from "../lib/utils";

dotenv.config();

async function main() {
  const argv = getDefaultYargsOptions()
    .option("sort", {
      alias: "sort",
      type: "string",
      description: "Sort banks",
      choices: ["symbol-asc", "symbol-desc", "price-asc", "price-desc"],
    })
    .parseSync();
  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadata = await getBankMetadata(argv.env as Environment);
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
      Price: `$${formatNumber(Number(price.priceRealtime.price))}`,
    };
  });

  const sortFunctions = {
    price: (a: any, b: any) => {
      const valueA = Number(a["Price"].replace(/[$,]/g, ""));
      const valueB = Number(b["Price"].replace(/[$,]/g, ""));
      return valueB - valueA;
    },
    symbol: (a: any, b: any) => {
      const metaA = bankMetadata.find((meta) => meta.bankAddress === a.Address);
      const metaB = bankMetadata.find((meta) => meta.bankAddress === b.Address);
      return metaA.tokenSymbol.localeCompare(metaB.tokenSymbol);
    },
  };

  const sortedBanksData = [...banksData];

  if (argv.sort) {
    const [field, direction] = argv.sort.split("-");

    if (field === "price") {
      direction === "desc"
        ? sortedBanksData.sort(sortFunctions.price)
        : sortedBanksData.sort((a, b) => sortFunctions.price(b, a));
    } else if (field === "symbol") {
      direction === "asc"
        ? sortedBanksData.sort(sortFunctions.symbol)
        : sortedBanksData.sort((a, b) => sortFunctions.symbol(b, a));
    }
  } else {
    // Default to sorting by symbol ascending when no sort option is provided
    sortedBanksData.sort(sortFunctions.symbol);
  }

  console.log(`\r\nFound ${sortedBanksData.length} banks in group ${argv.group}`);
  console.table(sortedBanksData);
}

main().catch((err) => {
  console.error(err);
});

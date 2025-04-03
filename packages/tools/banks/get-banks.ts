import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { getDefaultYargsOptions, getMarginfiProgram, configs } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata, getBankPrices } from "../lib/utils";

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
  const config = configs[argv.env as Environment];
  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadata = await getBankMetadata(argv.env as Environment);
  const bankAddresses = bankMetadata.map((meta) => new PublicKey(meta.bankAddress));

  const banks = await program.account.bank.fetchMultiple(bankAddresses);

  const priceMap = await getBankPrices(banks);

  const banksData = banks.map((item, index) => {
    const bankPubkey = bankAddresses[index];
    const bankMeta = bankMetadata[index];
    const bankAddress = bankPubkey.toString();
    const tokenAddress = item.mint.toBase58();
    const price = priceMap.get(tokenAddress);

    return {
      Symbol: bankMeta?.tokenSymbol,
      Address: bankAddress,
      Mint: item.mint.toString(),
      Type: item.config.riskTier.isolated ? "Isolated" : "Collateral",
      Price: price ? `$${formatNumber(Number(price))}` : "N/A",
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

  console.log(`\r\nFound ${sortedBanksData.length} banks in group ${config.GROUP_ADDRESS}`);
  console.table(sortedBanksData);
}

main().catch((err) => {
  console.error(err);
});

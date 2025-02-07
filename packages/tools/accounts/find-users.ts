import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { chunkedGetRawMultipleAccountInfos, chunks, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment, BankMetadata } from "../lib/types";
import { formatNumber } from "../lib/utils";
import { getCachedAccounts } from "../lib/utils";

dotenv.config();

async function main() {
  const argv = getDefaultYargsOptions()
    .option("assets", {
      type: "string",
      description: "Comma-separated list of token symbols to search for assets (e.g., 'USDC,ETH')",
    })
    .option("liabs", {
      type: "string",
      description: "Comma-separated list of token symbols to search for liabilities (e.g., 'SOL,USDT')",
    })
    .option("min-balance", {
      alias: "m",
      type: "number",
      description: "Minimum balance to return",
      default: 0.1,
    })
    .option("limit", {
      alias: "l",
      type: "number",
      description: "Maximum number of accounts to return",
      default: 1,
    })
    .check((argv) => {
      if (!argv.assets && !argv.liabilities) {
        throw new Error("At least one of --assets or --liabilities must be provided");
      }
      return true;
    })
    .parseSync();

  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadataResponse = await fetch("https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json");
  const bankMetadata = (await bankMetadataResponse.json()) as BankMetadata[];

  const assetSymbols = argv.assets ? argv.assets.split(",").map((s) => s.trim().toUpperCase()) : [];
  const liabilitySymbols = argv.liabs ? argv.liabs.split(",").map((s) => s.trim().toUpperCase()) : [];

  const assetBanks = assetSymbols.map((symbol) => {
    const bank = bankMetadata.find((meta) => meta.tokenSymbol.toUpperCase() === symbol);
    if (!bank) throw new Error(`No bank found for symbol: ${symbol}`);
    return new PublicKey(bank.bankAddress);
  });

  const liabilityBanks = liabilitySymbols.map((symbol) => {
    const bank = bankMetadata.find((meta) => meta.tokenSymbol.toUpperCase() === symbol);
    if (!bank) throw new Error(`No bank found for symbol: ${symbol}`);
    return new PublicKey(bank.bankAddress);
  });

  const bankToSymbol = new Map(bankMetadata.map((meta) => [meta.bankAddress, meta.tokenSymbol]));

  const bankAccounts = new Map();
  for (const bankPk of [...assetBanks, ...liabilityBanks]) {
    if (!bankAccounts.has(bankPk.toString())) {
      const bank = await program.account.bank.fetch(bankPk);
      bankAccounts.set(bankPk.toString(), bank);
    }
  }

  const marginfiAccounts: PublicKey[] = getCachedAccounts();

  console.log(`\r\nLoading marginfi account cache (${marginfiAccounts.length} accounts)`);

  const addressBatches = chunks(marginfiAccounts, 25_000);

  const matchingAccounts: {
    account: string;
    wallet: string;
    assets: { [key: string]: string };
    liabilities: { [key: string]: string };
  }[] = [];

  outerLoop: for (let i = 0; i < addressBatches.length; i++) {
    const addressBatch = addressBatches[i];
    console.log(`Processing batch ${i + 1}/${addressBatches.length} (${addressBatch.length} addresses)`);

    const [_, accountInfoMap] = await chunkedGetRawMultipleAccountInfos(
      program.provider.connection,
      addressBatch.map((pk) => pk.toBase58())
    );

    for (const [address] of accountInfoMap) {
      const acc = await program.account.marginfiAccount.fetch(address);

      // first check if account has any matching active balances in specified banks
      const hasMatchingAssets = assetBanks.every((bankPk) =>
        acc.lendingAccount.balances.some((balance) => balance.active && balance.bankPk.equals(bankPk))
      );

      const hasMatchingLiabs = liabilityBanks.every((bankPk) =>
        acc.lendingAccount.balances.some((balance) => balance.active && balance.bankPk.equals(bankPk))
      );

      // skip if account doesn't have all required positions
      if ((!assetBanks.length || hasMatchingAssets) && (!liabilityBanks.length || hasMatchingLiabs)) {
        const positions = new Map<string, { asset: number; liability: number }>();

        // only process balances for banks we care about
        const relevantBanks = [...assetBanks, ...liabilityBanks];
        const relevantBalances = acc.lendingAccount.balances.filter(
          (balance) => balance.active && relevantBanks.some((bank) => bank.equals(balance.bankPk))
        );

        for (const balance of relevantBalances) {
          const bank = bankAccounts.get(balance.bankPk.toString());
          if (!bank) continue;

          const deposit = wrappedI80F48toBigNumber(balance.assetShares)
            .times(wrappedI80F48toBigNumber(bank.assetShareValue))
            .div(10 ** bank.mintDecimals);

          const liability = wrappedI80F48toBigNumber(balance.liabilityShares)
            .times(wrappedI80F48toBigNumber(bank.liabilityShareValue))
            .div(10 ** bank.mintDecimals);

          const symbol = bankToSymbol.get(balance.bankPk.toString()) || balance.bankPk.toString();
          positions.set(symbol, {
            asset: deposit.toNumber(),
            liability: liability.toNumber(),
          });
        }

        // check if account meets minimum balance criteria
        const meetsMinimumBalances = [
          ...assetSymbols.map((symbol) => ({
            symbol,
            type: "asset" as const,
            minBalance: argv.minBalance,
          })),
          ...liabilitySymbols.map((symbol) => ({
            symbol,
            type: "liability" as const,
            minBalance: argv.minBalance,
          })),
        ].every(({ symbol, type, minBalance }) => {
          const position = positions.get(symbol);
          return position && position[type] >= minBalance;
        });

        if (meetsMinimumBalances) {
          const matchingAccount = {
            account: address,
            wallet: acc.authority.toString(),
            assets: Object.fromEntries(
              assetSymbols.map((symbol) => [symbol, formatNumber(positions.get(symbol)?.asset || 0)])
            ),
            liabilities: Object.fromEntries(
              liabilitySymbols.map((symbol) => [symbol, formatNumber(positions.get(symbol)?.liability || 0)])
            ),
          };

          matchingAccounts.push(matchingAccount);

          if (matchingAccounts.length >= argv.limit) {
            break outerLoop;
          }
        }
      }
    }
  }

  console.log(
    `\nSearch complete. Found ${matchingAccounts.length} matching account${matchingAccounts.length === 1 ? "" : "s"}:`
  );
  console.table(matchingAccounts);
}

main().catch((err) => {
  console.error(err);
});

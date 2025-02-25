import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { chunkedGetRawMultipleAccountInfos, chunks, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getCachedAccounts, getBankMetadata } from "../lib/utils";

dotenv.config();

type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};

async function main() {
  const argv = getDefaultYargsOptions()
    .option("address", {
      alias: "a",
      type: "string",
      description: "Bank public key",
    })
    .option("symbol", {
      alias: "s",
      type: "string",
      description: "Token symbol (e.g., 'USDC')",
    })
    .option("limit", {
      alias: "l",
      type: "number",
      description: "Limit the number of accounts to return",
      default: 5,
    })
    .option("min-balance", {
      alias: "m",
      type: "number",
      description: "Minimum balance to return",
      default: 0.01,
    })
    .option("type", {
      alias: "t",
      type: "string",
      description: "Type of accounts to return",
      choices: ["assets", "liabs"] as const,
      default: "assets",
    })
    .check((argv) => {
      if (!argv.address && !argv.symbol) {
        throw new Error("Either --address or --symbol must be provided");
      }
      if (argv.address && argv.symbol) {
        throw new Error("Please provide either --address or --symbol, not both");
      }
      return true;
    })
    .parseSync();

  const program = getMarginfiProgram(argv.env as Environment);
  const bankMetadata = await getBankMetadata();

  let bankPubkey: PublicKey;
  if (argv.address) {
    bankPubkey = new PublicKey(argv.address);
  } else {
    const bankMeta = bankMetadata.find((meta) => meta.tokenSymbol.toLowerCase() === argv.symbol.toLowerCase());
    if (!bankMeta) {
      throw new Error(`No bank found for symbol: ${argv.symbol}`);
    }
    bankPubkey = new PublicKey(bankMeta.bankAddress);
  }

  const bank = await program.account.bank.fetch(bankPubkey);

  let marginfiAccounts: PublicKey[] = getCachedAccounts();

  const addressBatches = chunks(marginfiAccounts, 25_000);

  const accountsData: {
    account: string;
    wallet: string;
    balance: string;
  }[] = [];

  console.log(`\r\nLoading marginfi account cache (${marginfiAccounts.length} accounts)`);

  outerLoop: for (let i = 0; i < addressBatches.length; i++) {
    const addressBatch = addressBatches[i];
    console.log(`Processing batch ${i + 1}/${addressBatches.length} of ${addressBatch.length} addresses`);

    const [_, accountInfoMap] = await chunkedGetRawMultipleAccountInfos(
      program.provider.connection,
      addressBatch.map((pk) => pk.toBase58())
    );

    for (const [address] of accountInfoMap) {
      const acc = await program.account.marginfiAccount.fetch(address);
      const hasMatchingBank = acc.lendingAccount.balances.find(
        (balance) => balance.active && balance.bankPk.equals(bankPubkey)
      );

      if (hasMatchingBank) {
        const deposit = wrappedI80F48toBigNumber(hasMatchingBank.assetShares).times(
          wrappedI80F48toBigNumber(bank.assetShareValue)
        );
        const liability = wrappedI80F48toBigNumber(hasMatchingBank.liabilityShares).times(
          wrappedI80F48toBigNumber(bank.liabilityShareValue)
        );

        const depositUi = deposit.div(10 ** bank.mintDecimals);
        const liabilityUi = liability.div(10 ** bank.mintDecimals);

        if (argv.type === "assets" && depositUi.lt(argv.minBalance)) {
          continue;
        }

        if (argv.type === "liabs" && liabilityUi.lt(argv.minBalance)) {
          continue;
        }

        accountsData.push({
          account: address,
          wallet: acc.authority.toString(),
          balance: formatNumber(argv.type === "assets" ? depositUi.toNumber() : liabilityUi.toNumber()),
        });

        if (accountsData.length >= argv.limit) {
          break outerLoop;
        }
      }
    }
  }

  console.log(`\nFound ${argv.type} for ${bankPubkey.toString()}:`);
  console.table(accountsData);
}

main().catch((err) => {
  console.error(err);
});

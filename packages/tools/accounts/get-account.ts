import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata, getBankMetadataFromBirdeye } from "../lib/utils";

dotenv.config();

type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};

async function main() {
  const argv = getDefaultYargsOptions()
    .option("account", {
      alias: "a",
      type: "string",
      demandOption: true,
      description: "Account public key",
    })
    .parseSync();

  const accountPubkey = new PublicKey(argv.account);
  const program = getMarginfiProgram(argv.env as Environment);

  // Fetch bank metadata
  const bankMetadata = await getBankMetadata(argv.env as Environment);

  let acc = await program.account.marginfiAccount.fetch(accountPubkey);
  let balances = acc.lendingAccount.balances;
  let activeBalances = [];
  let totalDeposits = 0;
  let totalLiabilities = 0;

  for (let i = 0; i < balances.length; i++) {
    if (!balances[i].active) continue;

    // Fetch bank data to get share prices
    const bank = await program.account.bank.fetch(balances[i].bankPk);
    const assetPrice = wrappedI80F48toBigNumber(bank.assetShareValue);
    const liabPrice = wrappedI80F48toBigNumber(bank.liabilityShareValue);

    const assetAmount = wrappedI80F48toBigNumber(balances[i].assetShares)
      .div(10 ** bank.mintDecimals)
      .multipliedBy(assetPrice);
    const liabAmount = wrappedI80F48toBigNumber(balances[i].liabilityShares)
      .div(10 ** bank.mintDecimals)
      .multipliedBy(liabPrice);

    totalDeposits += Number(assetAmount);
    totalLiabilities += Number(liabAmount);

    let bankMeta = bankMetadata.find((meta) => meta.bankAddress === balances[i].bankPk.toString());

    if (!bankMeta) {
      bankMeta = await getBankMetadataFromBirdeye(balances[i].bankPk, bank.mint);
    }

    // Convert timestamp to readable date
    const timestamp = Number(balances[i].lastUpdate.toString());
    const readableDate = new Date(timestamp * 1000).toLocaleString("en-US");

    activeBalances.push({
      "Bank PK": balances[i].bankPk.toString(),
      Symbol: bankMeta?.tokenSymbol || "",
      "Liability Amount": formatNumber(liabAmount),
      "Asset Amount": formatNumber(assetAmount),
      "Emissions Outstanding": formatNumber(wrappedI80F48toBigNumber(balances[i].emissionsOutstanding)),
      "Last Update": readableDate + " (EST)",
    });
  }

  // Display the active balances and totals
  console.log(`\r\nAccount: ${accountPubkey.toString()}`);
  console.log(`Authority: ${acc.authority.toString()}`);
  console.log(`Total Deposits: ${formatNumber(totalDeposits)}`);
  console.log(`Total Liabilities: ${formatNumber(totalLiabilities)}`);
  console.log("\r\nBalances:");
  console.table(activeBalances);
}

main().catch((err) => {
  console.error(err);
});

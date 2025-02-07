import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";

dotenv.config();

type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};

async function main() {
  const argv = getDefaultYargsOptions().parseSync();
  const program = getMarginfiProgram(argv.env as Environment);

  const bankMetadataResponse = await fetch("https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json");
  const bankMetadata = (await bankMetadataResponse.json()) as BankMetadata[];

  const bankAddresses = bankMetadata.map((meta) => new PublicKey(meta.bankAddress));

  const banks = await program.account.bank.fetchMultiple(bankAddresses);

  const banksData = banks
    .map((acc, index) => {
      if (!acc) return null;

      const bankPubkey = bankAddresses[index];
      const bankMeta = bankMetadata[index];

      return {
        Symbol: bankMeta?.tokenSymbol,
        Address: bankPubkey.toString(),
        Mint: acc.mint.toString(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.Symbol.localeCompare(b.Symbol));

  console.log(`\r\nFound ${banksData.length} banks in group ${argv.group}`);

  console.table(banksData);
}

main().catch((err) => {
  console.error(err);
});

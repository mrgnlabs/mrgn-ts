import { PublicKey } from "@solana/web3.js";
import { MarginfiAccountWrapper } from "../src";
import fs from "fs";
import { getMarginfiClient } from "./utils";
import { chunkedGetRawMultipleAccountInfos, chunks } from "@mrgnlabs/mrgn-common";

const BANK_TOKEN = "SOL";
// const BANK_TOKEN_MINT = "So11111111111111111111111111111111111111112";

interface BankDepositor {
  wallet: string;
  userAccount: string;
  amount: number;
}

async function main() {
  const client = await getMarginfiClient();

  const targetBank = client.getBankByTokenSymbol(BANK_TOKEN);
  // const targetBank = client.getBankByMint(BANK_TOKEN_MINT);
  if (!targetBank) {
    throw new Error(`Bank ${BANK_TOKEN} not found`);
  }

  console.log(`Fetching all marginfi accounts...`)
  const marginfiAccountAddresses = await client.getAllMarginfiAccountAddresses();
  console.log(`Found ${marginfiAccountAddresses.length} marginfi accounts`);

  const addressBatches = chunks(marginfiAccountAddresses, 25_000); // To avoid blowing memory

  const depositorFileName = `./marginfi_depositors_${BANK_TOKEN}_${Date.now()}.csv`;
  fs.writeFileSync(depositorFileName, "wallet,user_account,amount\n");

  for (let i = 0; i < addressBatches.length; i++) {
    const addressBatch = addressBatches[i];
    console.log(`Processing batch ${i + 1}/${addressBatches.length} of ${addressBatch.length} addresses`);

    const [_, accountInfoMap] = await chunkedGetRawMultipleAccountInfos(
      client.provider.connection,
      addressBatch.map((pk) => pk.toBase58())
    );

    let depositors: BankDepositor[] = [];
    for (const [address, accountInfo] of accountInfoMap) {
      const marginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(new PublicKey(address), client, accountInfo.data);
      const depositAmount = marginfiAccount.balances
        .find((b) => b.active && b.bankPk.equals(targetBank.address) && b.assetShares.gt(0))
        ?.computeQuantityUi(targetBank).assets;
      if (depositAmount) {
        depositors.push({
          wallet: marginfiAccount.authority.toString(),
          userAccount: marginfiAccount.address.toString(),
          amount: depositAmount.toNumber(),
        });
      }
    }
    const csvContent = depositors.map(depositor => `${depositor.wallet},${depositor.userAccount},${depositor.amount}`).join('\n');
    fs.appendFileSync(depositorFileName, csvContent);
  }
}

main();

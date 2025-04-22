import dotenv from "dotenv";
import { PublicKey, TransactionMessage, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { formatNumber, getBankMetadata, getBankMetadataFromBirdeye } from "../lib/utils";
import {
  BankConfig,
  BankRaw,
  buildFeedIdMap,
  findOracleKey,
  MarginfiAccount,
  MarginfiAccountRaw,
} from "@mrgnlabs/marginfi-client-v2";

dotenv.config();

type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};

async function main() {
  //   const argv = getDefaultYargsOptions()
  //     .option("account", {
  //       alias: "a",
  //       type: "string",
  //       demandOption: true,
  //       description: "Account public key",
  //     })
  //     .parseSync();

  const accountPubkey = new PublicKey("23wbuai64QpYcEKYSK7HdWYwVmiLKUghTkxrverRXrHe");
  const program = getMarginfiProgram();

  const accountRaw: MarginfiAccountRaw = await program.account.marginfiAccount.fetch(accountPubkey);
  const activePositions = accountRaw.lendingAccount.balances.filter((b) => b.active);
  const bankKeys = activePositions.map((b) => b.bankPk);
  const banks = (await program.account.bank.fetchMultiple(bankKeys)) as unknown as BankRaw[];

  const bankConfigs = await buildFeedIdMap(
    banks.map((b) => b.config),
    program.provider.connection
  );

  const parsedPositions = activePositions.map((b, index) => ({
    bank: b.bankPk,
    oracleKey: findOracleKey(BankConfig.fromAccountParsed(banks[index].config), bankConfigs),
    isActive: b.active,
  }));

  // Fetch bank metadata

  const ixs = await program.methods
    .lendingAccountPulseHealth()
    .accounts({
      marginfiAccount: accountPubkey,
    })
    .remainingAccounts(
      parsedPositions
        .map((p) => [
          {
            pubkey: p.bank,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: p.oracleKey,
            isSigner: false,
            isWritable: false,
          },
        ])
        .flatMap((p) => p)
    )
    .instruction();

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [ixs],
      payerKey: accountRaw.authority,
      recentBlockhash: (await program.provider.connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message([])
  );

  const health = await program.provider.connection.simulateTransaction(tx, {
    accounts: { encoding: "base64", addresses: [accountPubkey.toBase58()] },
    sigVerify: false,
  });

  const marginfiAccountPost = MarginfiAccount.decode(
    Buffer.from(health.value.accounts[0].data[0], "base64"),
    program.idl
  );

  const accPre = await program.account.marginfiAccount.fetch(accountPubkey);
  const cachePre = accPre.healthCache;

  const assetValuePre = wrappedI80F48toBigNumber(cachePre.assetValue).toNumber();
  const assetValuePost = wrappedI80F48toBigNumber(marginfiAccountPost.healthCache.assetValue).toNumber();

  const liabilityValuePre = wrappedI80F48toBigNumber(cachePre.liabilityValue).toNumber();
  const liabilityValuePost = wrappedI80F48toBigNumber(marginfiAccountPost.healthCache.liabilityValue).toNumber();

  console.groupCollapsed("%cLogs:", "font-weight: bold");
  health.value.logs.forEach((l) => console.log(`${l}`));
  console.groupEnd();

  console.log(`%cErrors: ${health.value.err}`, "font-weight: bold");

  console.groupCollapsed("%cPre State", "font-weight: bold");
  console.log(`AssetValue: ${assetValuePre}`);
  console.log(`LiabilityValue: ${liabilityValuePre}`);
  console.groupEnd();

  console.groupCollapsed("%cPost State", "font-weight: bold");
  console.log(`AssetValue: ${assetValuePost}`);
  console.log(`LiabilityValue: ${liabilityValuePost}`);
  console.log(`Health: ${(assetValuePost - liabilityValuePost) / assetValuePost}`);
  console.groupEnd();

  // Display the active balances and totals
  //   console.log(`\r\nAccount: ${accountPubkey.toString()}`);
  //   console.log(`Authority: ${acc.authority.toString()}`);
  //   console.log(`Total Deposits: ${formatNumber(totalDeposits)}`);
  //   console.log(`Total Liabilities: ${formatNumber(totalLiabilities)}`);
  //   console.log("\r\nBalances:");
  //   console.table(activeBalances);
}

main().catch((err) => {
  console.error(err);
});

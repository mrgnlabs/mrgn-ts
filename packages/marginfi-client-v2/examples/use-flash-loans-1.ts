import { getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient({ readonly: true });

  const marginfiAccounts = await client.getMarginfiAccountsForAuthority();
  if (marginfiAccounts.length === 0) throw Error("No marginfi account found");

  const marginfiAccount = marginfiAccounts[0];

  const solBank = client.getBankByTokenSymbol("SOL");
  if (!solBank) throw Error("SOL bank not found");

  const amount = 10; // SOL

  const borrowIx = await marginfiAccount.makeBorrowIx(amount, solBank.address);
  const repayIx = await marginfiAccount.makeRepayIx(amount, solBank.address, true);

  const flashLoanTx = await marginfiAccount.buildFlashLoanTx({
    ixs: [...borrowIx.instructions, ...repayIx.instructions],
    signers: [],
  });

  await client.processTransaction(flashLoanTx);
}

main().catch((e) => console.log(e));

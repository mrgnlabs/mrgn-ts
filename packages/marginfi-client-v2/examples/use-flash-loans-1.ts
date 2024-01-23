import { PublicKey } from "@solana/web3.js";
import { MarginfiAccountWrapper } from "../src";
import { getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient({readonly: true, authority: new PublicKey("7ihN8QaTfNoDTRTQGULCzbUT3PHwPDTu5Brcu4iT2paP")});

  const marginfiAccount = await MarginfiAccountWrapper.fetch("EW1iozTBrCgyd282g2eemSZ8v5xs7g529WFv4g69uuj2", client);

  const solBank = client.getBankByTokenSymbol("SOL");
  if (!solBank) throw Error("SOL bank not found");

  const amount = 10; // SOL

  const borrowIx = await marginfiAccount.makeBorrowIx(amount, solBank.address);
  const repayIx = await marginfiAccount.makeRepayIx(amount, solBank.address, true);

  await marginfiAccount.buildFlashLoanTx({
    ixs: [...borrowIx.instructions, ...repayIx.instructions],
    signers: [],
  });
}

main().catch((e) => console.log(e));

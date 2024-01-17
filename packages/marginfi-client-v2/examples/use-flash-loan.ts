import { PublicKey } from "@solana/web3.js";
import { MarginfiAccountWrapper } from "../src";
import { confirmOrAbort, getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient({readonly: true, authority: new PublicKey("7ihN8QaTfNoDTRTQGULCzbUT3PHwPDTu5Brcu4iT2paP")});

  console.log(`Using ${client.config.environment} environment; wallet: ${client.wallet.publicKey.toBase58()}`);
  if (client.config.environment === "production") {
    await confirmOrAbort("Proceeding will cost SOL. Do you want to continue? (yes/no) ");
  }

  const marginfiAccount = await MarginfiAccountWrapper.fetch("EW1iozTBrCgyd282g2eemSZ8v5xs7g529WFv4g69uuj2", client);

  const solBank = client.getBankByTokenSymbol("SOL");
  if (!solBank) throw Error("SOL bank not found");

  const amount = 10; // SOL

  const borrowIx = await marginfiAccount.makeBorrowIx(amount, solBank.address);

  await marginfiAccount.flashLoan({
    ixs: [...borrowIx.instructions],
    signers: [],
  });
}

main().catch((e) => console.log(e));

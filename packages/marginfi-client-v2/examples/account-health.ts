import { Connection } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { AccountType, getConfig, MarginfiClient } from "../src";
import MarginfiAccount, { MarginRequirementType } from "../src/account";

async function main() {
  const connection = new Connection(process.env.RPC_ENDPOINT!, "confirmed");
  const wallet = NodeWallet.local();
  const config = await getConfig();
  const client = await MarginfiClient.fetch(config, wallet, connection);

  const programAddresses = await client.getAllProgramAccountAddresses(AccountType.MarginfiGroup);
  console.log(programAddresses.map((key) => key.toBase58()));

  const marginfiAccount = await MarginfiAccount.fetch(process.env.MARGINFI_ACCOUNT!, client);

  const group = marginfiAccount.group;

  const bankLabel1 = "SOL";
  const bank1 = group.getBankByLabel(bankLabel1);
  if (!bank1) throw Error(`${bankLabel1} bank not found`);

  const bankLabel2 = "USDC";
  const bank2 = group.getBankByLabel(bankLabel2);
  if (!bank2) throw Error(`${bankLabel2} bank not found`);

  const { assets, liabilities } = marginfiAccount.getHealthComponents(MarginRequirementType.Init);

  console.log("Assets: %s, Liabs: %s", assets, liabilities);

  console.log(marginfiAccount.describe());

  group.banks.forEach((bank) => console.log(bank.describe()));
}

main();

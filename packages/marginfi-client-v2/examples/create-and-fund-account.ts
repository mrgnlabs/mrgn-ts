import { MarginRequirementType } from "../src";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { confirmOrAbort, getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient();

  console.log(`Using ${client.config.environment} environment; wallet: ${client.wallet.publicKey.toBase58()}`);
  if (client.config.environment === "production") {
    await confirmOrAbort("Proceeding will cost SOL. Do you want to continue? (yes/no) ");
  }

  const marginfiAccount = await client.createMarginfiAccount();

  const bankLabel1 = "SOL";
  const bank1 = client.getBankByTokenSymbol(bankLabel1);
  if (!bank1) throw Error(`${bankLabel1} bank not found`);
  const bankLabel2 = "USDC";
  const bank2 = client.getBankByTokenSymbol(bankLabel2);
  if (!bank2) throw Error(`${bankLabel2} bank not found`);

  await marginfiAccount.deposit(1, bank1.address);
  await marginfiAccount.deposit(2, bank2.address);

  await marginfiAccount.reload();

  marginfiAccount.activeBalances.forEach((balance) => {
    const bank = client.getBankByPk(balance.bankPk)!;
    const oraclePrice = client.getOraclePriceByBank(bank.address)!;
    const { assets, liabilities } = balance.computeUsdValue(bank, oraclePrice, MarginRequirementType.Equity);

    console.log(
      `Balance for ${shortenAddress(bank.mint)} (${shortenAddress(
        balance.bankPk
      )}) deposits: ${assets}, borrows: ${liabilities}`
    );
  });
}

main().catch((e) => console.log(e));

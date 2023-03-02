import { Environment, getConfig, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { loadKeypair, NodeWallet } from "@mrgnlabs/mrgn-common";
import { getAssociatedTokenAddressSync } from "@mrgnlabs/mrgn-common/src/spl";
import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { env_config } from "./config";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

(async () => {
  console.log("Creating marginfi account");

  const connection = new Connection(env_config.RPC_ENDPOINT, "confirmed");
  const config = getConfig(env_config.MRGN_ENV as Environment);
  const client = await MarginfiClient.fetch(config, new NodeWallet(loadKeypair(env_config.KEYPAIR_PATH)), connection);

  const marginfiAccount = await client.createMarginfiAccount();
  console.log("Liquidator %s account created", marginfiAccount.publicKey);

  const balance = new BigNumber(
    (await connection.getTokenAccountBalance(getAssociatedTokenAddressSync(USDC_MINT, client.wallet.publicKey))).value
      .uiAmount ?? 0,
  );
  if (balance.gt(0)) {
    console.log("Fund liquidator account with %s USDC? [y/n]", balance);

    const y = await new Promise((resolve) => {
      process.stdin.on("data", (data) => {
        resolve(data.toString().trim());
      });
    });

    if (y === "y") {
      await marginfiAccount.deposit(balance, client.group.getBankByLabel("USDC")!);
      console.log("Deposited %s USDC", balance);
    } else {
      console.log("Not depositing, your liquidator account will be empty");
      console.log("You need to fund your liquidator account with USDC to be able to liquidate");
    }
  } else {
    console.log("No USDC balance found, your liquidator account will be empty");
    console.log("You need to fund your liquidator account with USDC to be able to liquidate");
  }

  console.log("run `export LIQUIDATOR_PK=%s` to set the liquidator account", marginfiAccount.publicKey);
  console.log("then `yarn start` to start the liquidator");
  process.exit(0);
})();

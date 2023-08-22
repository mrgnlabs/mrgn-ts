import { getConfig, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { getAssociatedTokenAddressSync, NodeWallet } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { env_config } from "./config";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

(async () => {
  const connection = new Connection(env_config.RPC_ENDPOINT, "confirmed");
  const config = getConfig(env_config.MRGN_ENV);
  const client = await MarginfiClient.fetch(config, new NodeWallet(env_config.WALLET_KEYPAIR), connection);

  console.log("Create marginfi account for wallet %s? [y/N]", client.wallet.publicKey.toBase58());
  const y = await new Promise((resolve) => {
    process.stdin.on("data", (data) => {
      resolve(data.toString().trim());
    });
  });
  let marginfiAccount: MarginfiAccountWrapper;
  if (y === "y") {
    console.log("Creating marginfi account");
    marginfiAccount = await client.createMarginfiAccount();
    console.log("Liquidator %s account created", marginfiAccount.address);
  } else {
    console.log("Exiting");
    process.exit(0);
  }

  const balance = new BigNumber(
    (await connection.getTokenAccountBalance(getAssociatedTokenAddressSync(USDC_MINT, client.wallet.publicKey))).value
      .uiAmount ?? 0
  );
  if (balance.gt(0)) {
    console.log("Fund liquidator account with %s USDC? [y/N]", balance);

    const y = await new Promise((resolve) => {
      process.stdin.on("data", (data) => {
        resolve(data.toString().trim());
      });
    });

    if (y === "y") {
      await marginfiAccount.deposit(balance, client.getBankByMint(USDC_MINT)!.address);
      console.log("Deposited %s USDC", balance);
    } else {
      console.log("Not depositing, your liquidator account will be empty");
      console.log("You need to fund your liquidator account with USDC to be able to liquidate");
    }
  } else {
    console.log("No USDC balance found, your liquidator account will be empty");
    console.log("You need to fund your liquidator account with USDC to be able to liquidate");
  }

  console.log("run `export LIQUIDATOR_PK=%s` to set the liquidator account", marginfiAccount.address);
  console.log("then `yarn start` to start the liquidator");
  process.exit(0);
})();

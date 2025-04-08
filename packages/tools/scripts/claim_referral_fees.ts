import dotenv from "dotenv";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ReferralProvider } from "@jup-ag/referral-sdk";
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { loadKeypairFromFile } from "./utils";
import { formatNumber, getPriceAndMetadataFromBirdeye } from "../lib/utils";

dotenv.config();

const MIN_VALUE = 1000;

const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT || "");
const wallet = loadKeypairFromFile(process.env.MARGINFI_WALLET);
const referralPubKey = new PublicKey("Mm7HcujSK2JzPW4eX7g4oqTXbWYDuFxapNMHXe8yp1B");
const provider = new ReferralProvider(connection as any);

(async () => {
  console.log("Fetching referral tokens...");

  const referralTokens = await provider.getReferralTokenAccountsWithStrategy(referralPubKey.toString(), {
    type: "token-list",
    tokenList: "strict",
  });

  const withdrawalableTokenAddress = [
    ...(referralTokens.tokenAccounts || []),
    ...(referralTokens.token2022Accounts || []),
  ];

  const mints = withdrawalableTokenAddress.map((token) => token.account.mint.toBase58());
  const uniqueMints = [...new Set(mints)];

  const { metadata, price } = await getPriceAndMetadataFromBirdeye(uniqueMints.map((mint) => new PublicKey(mint)));

  console.log(`\r\nFound ${withdrawalableTokenAddress.length} referral token accounts`);

  const tokens = withdrawalableTokenAddress
    .map((token) => {
      const mintAddress = token.account.mint.toBase58();
      const tokenMetadata = metadata[mintAddress];
      const tokenPrice = price[mintAddress];

      if (!tokenMetadata || !tokenPrice) {
        console.error(`\r\nSkipping token ${mintAddress} - missing metadata or price`);
        return;
      }

      const decimals = tokenMetadata.decimals || 0;
      const amount = Number(token.account.amount) / 10 ** decimals;
      const value = amount * Number(tokenPrice.value);

      return {
        pk: token.pubkey.toBase58(),
        mint: mintAddress,
        symbol: tokenMetadata.symbol,
        decimals,
        amount,
        value,
      };
    })
    .sort((a, b) => b.value - a.value)
    .filter((token) => token.value > MIN_VALUE);

  console.log(`\r\nShowing token accounts > $${MIN_VALUE}`);

  tokens.forEach(async (token) => {
    console.log("\r\nToken referral address", token.pk);
    console.log("Token mint", token.mint);
    console.log("Token symbol", token.symbol);
    console.log("Token amount", token.amount);
    console.log("Token price", token.value);
    console.log("Token value", `$${formatNumber(token.value)}`);
  });

  // This method will returns a list of transactions for all claims batched by 5 claims for each transaction.
  // const txs = await provider.claimPartially({
  //   withdrawalableTokenAddress: tenWithdrawableTokenAddress, // Enter your withdrawalable token address here.
  //   payerPubKey: wallet.publicKey,
  //   referralAccountPubKey: referralPubKey,
  // });

  // const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // Send each claim transaction one by one.
  // for (const tx of txs) {
  //   tx.sign([wallet]);

  //   const txid = await connection.sendTransaction(tx);
  //   const { value } = await connection.confirmTransaction({
  //     signature: txid,
  //     blockhash,
  //     lastValidBlockHeight,
  //   });

  //   if (value.err) {
  //     console.log({ value, txid });
  //   } else {
  //     console.log({ txid });
  //   }
  // }
})();

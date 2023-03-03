import { getConfig, MarginfiClient, MarginfiGroup } from "@mrgnlabs/marginfi-client-v2"
import { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { nativeToUi, NodeWallet } from "@mrgnlabs/mrgn-common";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = new NodeWallet(Keypair.generate());

(async () => {
    const config = await getConfig();
    const client = await MarginfiClient.fetch(config, wallet, connection);

    const group = await MarginfiGroup.fetch(config, client.program);

    const bank = group.getBankByLabel("mSOL")!;

    const tvl = nativeToUi(bank.totalAssets, bank.mintDecimals);
    const tvlUSD = bank.getUsdValue(bank.totalAssets, PriceBias.None);

    console.log("TVL: %s mSOL (%s USD)", tvl.toFixed(3), tvlUSD.toFixed(3));
})()

import { Connection } from "@solana/web3.js";
import { MarginfiClientReadonly } from "@mrgnlabs/marginfi-client-v2";
import config from "~/config";

const getRoClient = async () => {
    return await MarginfiClientReadonly.fetch(
        config.mfiConfig,
        new Connection(
            process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "https://mrgn.rpcpool.com/",
        )
    )
}

export { getRoClient }

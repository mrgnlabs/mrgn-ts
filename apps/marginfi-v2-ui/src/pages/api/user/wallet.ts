import { NextApiResponse } from "next";
import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/mrgn-state";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { NextApiRequest } from "../utils";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@mrgnlabs/mrgn-common";

type WalletRequest = {
  wallet: string;
};

export default async function handler(req: NextApiRequest<WalletRequest>, res: NextApiResponse) {
  const ownerAddress = req.query.wallet as string;

  if (!ownerAddress) {
    return res.status(STATUS_BAD_REQUEST).json({ error: true, message: "Missing wallet address" });
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${ownerAddress}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const { success, data } = await response.json();

    if (!success || !data) {
      throw new Error("Invalid response from Birdeye API");
    }

    const tokens: WalletToken[] = (
      await Promise.all(
        data.items
          .filter((item: any) => item.name !== null && item.symbol !== null)
          .slice(0, 20)
          .map(async (item: any) => {
            const mint = new PublicKey(item.address);
            const owner = new PublicKey(ownerAddress);
            const ata = getAssociatedTokenAddressSync(mint, owner);

            return {
              address: item.address,
              name: item.name,
              symbol: item.symbol,
              price: item.priceUsd,
              value: item.valueUsd,
              logoUri: item.logoURI,
              balance: item.uiAmount,
              ata: ata.toBase58(),
              mintDecimals: item.decimals,
            };
          })
      )
    ).sort((a, b) => b.value - a.value);

    // cache for 30 secs
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=59");
    return res.status(STATUS_OK).json(tokens);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}

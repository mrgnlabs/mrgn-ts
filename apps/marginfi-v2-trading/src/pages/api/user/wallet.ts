import { NextApiResponse } from "next";
import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";
import { NextApiRequest } from "../utils";

type WalletRequest = {
  wallet: string;
};

type Token = {
  name: string;
  symbol: string;
  price: number;
  total: number;
};

async function fetchAssets(
  ownerAddress: string,
  page: number = 1,
  allItems: any[] = [],
  nativeBalance: any = null
): Promise<{ items: any[]; nativeBalance: any }> {
  const url = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY!}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "searchAssets",
      params: {
        ownerAddress,
        page,
        limit: 1000,
        tokenType: "fungible",
        displayOptions: {
          showNativeBalance: true,
        },
      },
    }),
  });

  const { result } = await response.json();
  allItems.push(...result.items);

  if (page === 1 && result.nativeBalance) {
    nativeBalance = result.nativeBalance;
  }

  if (result.items.length === 1000) {
    return fetchAssets(ownerAddress, page + 1, allItems, nativeBalance);
  } else {
    return { items: allItems, nativeBalance };
  }
}

export default async function handler(req: NextApiRequest<WalletRequest>, res: NextApiResponse) {
  const ownerAddressParam = req.query.wallet as string;
  const tokenListParam = req.query.tokenList as string;

  if (!ownerAddressParam) {
    return res.status(STATUS_BAD_REQUEST).json({ error: true, message: "Missing wallet address" });
  }

  const ownerAddress = ownerAddressParam;
  const tokenList = tokenListParam ? Boolean(tokenListParam) : false;

  const { items, nativeBalance } = await fetchAssets(ownerAddress);

  const tokens: Token[] = items
    .filter((item: any) => item.token_info?.price_info?.total_price)
    .map((item: any) => {
      return {
        name: item.content.metadata.name,
        symbol: item.content.metadata.symbol,
        price: item.token_info.price_info.price_per_token,
        total: item.token_info.price_info.total_price,
      };
    })
    .sort((a: any, b: any) => b.total - a.total);

  tokens.unshift({
    name: "SOL",
    symbol: "SOL",
    price: nativeBalance.price_per_sol,
    total: nativeBalance.total_price,
  });

  const totalValue = tokens.reduce((acc: number, item: Token) => acc + item.total, 0);

  const data: {
    totalValue: number;
    tokens?: Token[];
  } = {
    totalValue,
  };

  if (tokenList) {
    data.tokens = tokens;
  }

  return res.status(STATUS_OK).json(data);
}

import { object, string, number, array, Infer, assert } from "superstruct";

// ----------------------------------------------------------------------------
// Token metadata cache
// ----------------------------------------------------------------------------

interface TokenMetadata {
  icon?: string;
  name: string;
  symbol: string;
}

const TokenMetadataRaw = object({
  address: string(),
  chainId: number(),
  decimals: number(),
  name: string(),
  symbol: string(),
  logoURI: string(),
  extensions: object(),
});
const TokenMetadataList = array(TokenMetadataRaw);

type TokenMetadataRaw = Infer<typeof TokenMetadataRaw>;
type TokenMetadataListRaw = Infer<typeof TokenMetadataList>;

function parseTokenMetadata(tokenMetadataRaw: TokenMetadataRaw): TokenMetadata {
  return {
    icon: tokenMetadataRaw.logoURI,
    name: tokenMetadataRaw.name,
    symbol: tokenMetadataRaw.symbol,
  };
}

function parseTokenMetadatas(tokenMetadataListRaw: TokenMetadataListRaw): {
  [symbol: string]: TokenMetadata;
} {
  return tokenMetadataListRaw.reduce(
    (config, current, _) => ({
      [current.symbol]: parseTokenMetadata(current),
      ...config,
    }),
    {} as {
      [symbol: string]: TokenMetadata;
    }
  );
}

async function loadTokenMetadatas(): Promise<{
  [symbol: string]: TokenMetadata;
}> {
  const response = await fetch(`https://storage.googleapis.com/mrgn-public/mrgn-token-metadata-cache.json`, {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });

  if (response.status === 200) {
    const responseData = await response.json();
    assert(responseData, TokenMetadataList);
    return parseTokenMetadatas(responseData);
  } else {
    throw new Error("Failed to fetch token metadata cache");
  }
}

type TokenMetadataMap = { [symbol: string]: TokenMetadata };

export { loadTokenMetadatas };
export type { TokenMetadata, TokenMetadataRaw, TokenMetadataListRaw, TokenMetadataMap };

// ----------------------------------------------------------------------------
// Bank metadata cache
// ----------------------------------------------------------------------------

interface BankMetadata {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

const BankMetadataRaw = object({
  bankAddress: string(),
  tokenAddress: string(),
  tokenName: string(),
  tokenSymbol: string(),
});
const BankMetadataList = array(BankMetadataRaw);

type BankMetadataRaw = Infer<typeof BankMetadataRaw>;
type BankMetadataListRaw = Infer<typeof BankMetadataList>;

function parseBankMetadata(bankMetadataRaw: BankMetadataRaw): BankMetadata {
  return {
    tokenAddress: bankMetadataRaw.tokenAddress,
    tokenName: bankMetadataRaw.tokenName,
    tokenSymbol: bankMetadataRaw.tokenSymbol,
  };
}

function parseBankMetadatas(bankMetadataListRaw: BankMetadataListRaw): {
  [symbol: string]: BankMetadata;
} {
  return bankMetadataListRaw.reduce(
    (config, current, _) => ({
      [current.bankAddress]: parseBankMetadata(current),
      ...config,
    }),
    {} as {
      [address: string]: BankMetadata;
    }
  );
}

async function loadBankMetadatas(): Promise<{
  [address: string]: BankMetadata;
}> {
  const response = await fetch(`https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json`, {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });

  if (response.status === 200) {
    const responseData = await response.json();
    assert(responseData, BankMetadataList);
    return parseBankMetadatas(responseData);
  } else {
    throw new Error("Failed to fetch bank metadata cache");
  }
}

type BankMetadataMap = { [address: string]: BankMetadata };

export { loadBankMetadatas };
export type { BankMetadata, BankMetadataRaw, BankMetadataListRaw, BankMetadataMap };

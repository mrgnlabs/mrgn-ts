import { object, string, number, array, Infer, assert, optional } from "superstruct";

// ----------------------------------------------------------------------------
// Token metadata cache
// ----------------------------------------------------------------------------

interface TokenMetadata {
  address: string;
  icon?: string;
  name: string;
  symbol: string;
  decimals: number;
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
    address: tokenMetadataRaw.address,
    icon: tokenMetadataRaw.logoURI,
    name: tokenMetadataRaw.name,
    symbol: tokenMetadataRaw.symbol,
    decimals: tokenMetadataRaw.decimals,
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

async function loadTokenMetadatas(
  cacheUrl: string = "https://storage.googleapis.com/mrgn-public/mrgn-token-metadata-cache.json"
): Promise<{
  [symbol: string]: TokenMetadata;
}> {
  const response = await fetch(cacheUrl, {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });

  if (response.status === 200) {
    const responseData = await response.json();
    // assert(responseData, TokenMetadataList);
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
  validatorVoteAccount?: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

const BankMetadataRaw = object({
  groupAddress: optional(string()), // optional as only present on arena cache not mrgnlend
  validatorVoteAccount: optional(string()), // optional as only present on staked asset banks
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
    validatorVoteAccount: bankMetadataRaw.validatorVoteAccount ?? undefined,
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

async function loadStakedBankMetadatas(
  cacheUrl: string = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json"
): Promise<{
  [address: string]: BankMetadata;
}> {
  return loadBankMetadatas(cacheUrl);
}

async function loadBankMetadatas(
  cacheUrl: string = "https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json"
): Promise<{
  [address: string]: BankMetadata;
}> {
  const response = await fetch(cacheUrl, {
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

export { loadBankMetadatas, loadStakedBankMetadatas };
export type { BankMetadata, BankMetadataRaw, BankMetadataListRaw, BankMetadataMap };

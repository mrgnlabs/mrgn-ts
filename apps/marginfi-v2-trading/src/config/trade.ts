const invalidateCache = process.env.NEXT_PUBLIC_INVALIDATE_GCP_CACHE === "true" ? `?t=${Date.now()}` : "";

export const TRADE_GROUPS_MAP =
  (process.env.NEXT_PUBLIC_GROUPS_MAP || "https://storage.googleapis.com/mrgn-public/mfi-trade-groups.json") +
  invalidateCache;
export const TOKEN_METADATA_MAP =
  (process.env.NEXT_PUBLIC_TOKENS_MAP ||
    "https://storage.googleapis.com/mrgn-public/mfi-trade-token-metadata-cache.json") + invalidateCache;
export const BANK_METADATA_MAP =
  (process.env.NEXT_PUBLIC_BANKS_MAP ||
    "https://storage.googleapis.com/mrgn-public/mfi-trade-bank-metadata-cache.json") + invalidateCache;
export const POOLS_PER_PAGE = 12;

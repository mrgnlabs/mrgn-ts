const invalidateCache = process.env.NEXT_PUBLIC_INVALIDATE_GCP_CACHE === "true" ? `?t=${Date.now()}` : "";
export const TOKEN_ICON_BASE_URL =
  process.env.IMAGE_CACHE || "https://storage.googleapis.com/mrgn-public/mrgn-trade-token-icons/";

export const POOLS_PER_PAGE = 12;

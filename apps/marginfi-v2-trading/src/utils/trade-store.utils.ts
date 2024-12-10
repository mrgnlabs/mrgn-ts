import { loadTokenMetadatas, loadBankMetadatas, BankMetadataMap, TokenMetadataMap } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import { GetStaticProps } from "next";
import { LUT_GROUPS_MAP, TRADE_GROUPS_MAP, TOKEN_METADATA_MAP, BANK_METADATA_MAP } from "~/config/trade";
import { BankData } from "~/store/tradeStoreV2";
import { TokenData } from "~/types";

type TradeGroupsCache = {
  [group: string]: [string, string];
};

type PoolSummaryByGroupResponse = Record<
  string,
  {
    tokenBankSummary: BankSummaryApiResponse;
    quoteBankSummary: BankSummaryApiResponse;
  }
>;

interface BankSummaryApiResponse extends BankData {
  bankPk: string;
  mint: string;
}

export type InitialArenaState = {
  lutGroupsCache: {
    [groupPk: string]: PublicKey;
  };
  groupsCache: TradeGroupsCache;
  tokenMetadataCache: TokenMetadataMap;
  bankMetadataCache: BankMetadataMap;
  tokenDetails: TokenData[];
  bankSummaryByGroup: PoolSummaryByGroupResponse;
};

export interface StaticArenaProps {
  initialData: InitialArenaState;
}

export const getArenaStaticProps: GetStaticProps<StaticArenaProps> = async () => {
  const emptyState: InitialArenaState = {
    lutGroupsCache: {},
    groupsCache: {},
    tokenMetadataCache: {},
    bankMetadataCache: {},
    tokenDetails: [],
    bankSummaryByGroup: {},
  };

  try {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    const initialData = await fetchInitialArenaState(process.env.NEXT_PUBLIC_VERCEL_URL);

    if (!initialData) {
      throw new Error("Failed to fetch initial arena state");
    }

    return {
      props: { initialData },
      revalidate: 300, // Revalidate every 5 minutes
    };
  } catch (error) {
    // Log the specific error for debugging
    console.error("Error in getStaticProps:", error instanceof Error ? error.message : "Unknown error");

    return {
      props: { initialData: emptyState },
      revalidate: 300, // Keep revalidating even in error case
    };
  }
};

export const fetchInitialArenaState = async (host?: string): Promise<InitialArenaState | undefined> => {
  let arenaState: InitialArenaState;

  const baseUrl = host ? `https://${host}` : "http://localhost:3006";

  try {
    // Fetch all data in parallel using Promise.all
    const [lutData, groupsData, tokenData, bankData, tokenDetailsData, bankSummaryByGroup] = await Promise.all([
      fetch(LUT_GROUPS_MAP).then((res) => res.json()),
      fetch(TRADE_GROUPS_MAP).then((res) => res.json()),
      loadTokenMetadatas(TOKEN_METADATA_MAP),
      loadBankMetadatas(BANK_METADATA_MAP),
      fetch(`${baseUrl}/api/birdeye/arenaTokens`).then((res) => res.json()),
      fetch(`${baseUrl}/api/pool/summary`).then((res) => res.json()),
    ]);

    arenaState = {
      lutGroupsCache: lutData,
      groupsCache: groupsData,
      tokenMetadataCache: tokenData,
      bankMetadataCache: bankData,
      tokenDetails: tokenDetailsData,
      bankSummaryByGroup: bankSummaryByGroup,
    };

    return arenaState;
  } catch (error) {
    console.error("Failed to fetch cache data:", error);
    return;
  }
};

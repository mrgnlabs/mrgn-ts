import { loadTokenMetadatas, loadBankMetadatas, BankMetadataMap, TokenMetadataMap } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import { GetStaticProps } from "next";
import { LUT_GROUPS_MAP, TRADE_GROUPS_MAP, TOKEN_METADATA_MAP, BANK_METADATA_MAP } from "~/config/trade";
import { BankData } from "~/store/tradeStoreV2";
import { TokenData } from "~/types";
import { PoolApiResponse } from "~/types/api.types";

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
  tokenDetails: TokenData[];
  poolData: PoolApiResponse[];
};

export interface StaticArenaProps {
  initialData: InitialArenaState;
}

export const getArenaStaticProps: GetStaticProps<StaticArenaProps> = async () => {
  const emptyState: InitialArenaState = {
    poolData: [],
    tokenDetails: [],
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
    const [poolData, tokenDetailsData] = await Promise.all([
      fetch(`${baseUrl}/api/pool/list`).then((res) => res.json() as Promise<PoolApiResponse[]>),
      fetch(`${baseUrl}/api/birdeye/arenaTokens`, {
        headers: {
          origin: baseUrl || "",
          referer: baseUrl || "",
        },
      }).then((res) => res.json()),
      // fetch(`${baseUrl}/api/pool/summary`).then((res) => res.json()),
    ]);

    arenaState = {
      poolData,
      tokenDetails: tokenDetailsData,
    };

    return arenaState;
  } catch (error) {
    console.error("Failed to fetch cache data:", error);
    return;
  }
};

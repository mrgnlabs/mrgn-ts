import { create, StateCreator } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import Fuse, { FuseResult } from "fuse.js";
import {
  ExtendedBankInfo,
  makeExtendedBankInfo,
  fetchTokenAccounts,
  TokenAccountMap,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  AccountSummary,
  fetchGroupData,
} from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiClient,
  getConfig,
  Bank,
  OraclePrice,
  MarginfiAccountWrapper,
  MintData,
} from "@mrgnlabs/marginfi-client-v2";
import {
  Wallet,
  TokenMetadata,
  loadTokenMetadatas,
  loadBankMetadatas,
  getValueInsensitive,
  BankMetadata,
  LST_MINT,
} from "@mrgnlabs/mrgn-common";

import { TRADE_GROUPS_MAP, TOKEN_METADATA_MAP, BANK_METADATA_MAP, POOLS_PER_PAGE } from "~/config/trade";
import { TokenData } from "~/types";
import { getGroupPositionInfo } from "~/utils";
import { getTransactionStrategy } from "@mrgnlabs/mrgn-utils";

type TradeGroupsCache = {
  [group: string]: [string, string];
};

export enum TradePoolFilterStates {
  TIMESTAMP = "timestamp",
  PRICE_MOVEMENT_ASC = "price-movement-asc",
  PRICE_MOVEMENT_DESC = "price-movement-desc",
  MARKET_CAP_ASC = "market-cap-asc",
  MARKET_CAP_DESC = "market-cap-desc",
  LIQUIDITY_ASC = "liquidity-asc",
  LIQUIDITY_DESC = "liquidity-desc",
  APY_ASC = "apy-asc",
  APY_DESC = "apy-desc",
}

export type ArenaBank = ExtendedBankInfo & {
  tokenData?: {
    price: number;
    priceChange24hr: number;
    volume24hr: number;
    volumeChange24hr: number;
    marketCap: number;
  };
};

export type ArenaPool = {
  token: ArenaBank;
  quoteTokens: ArenaBank[]; // will just be single USDC bank for now, but this allows us to add quote tokens in future
  // just total liquidity for now, this could be other stats we get from goncarlo api
  poolData?: {
    totalLiquidity: number;
  };
};

export interface GroupData {
  groupPk: PublicKey;
  pool: ArenaPool;
  client: MarginfiClient;
  marginfiAccounts: MarginfiAccountWrapper[];
  selectedAccount: MarginfiAccountWrapper | null;
  accountSummary: AccountSummary;
}

type Portfolio = {
  long: GroupData[];
  short: GroupData[];
  lpPositions: GroupData[];
} | null;

type TradeStoreState = {
  // keep track of store state
  initialized: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;

  // cache groups json store
  groupsCache: TradeGroupsCache;
  tokenMetadataCache: {
    [symbol: string]: TokenMetadata;
  };
  bankMetadataCache: {
    [symbol: string]: BankMetadata;
  };

  // user token account map
  tokenAccountMap: TokenAccountMap | null;

  // array of marginfi groups
  groupMap: Map<string, GroupData>;

  // array of banks filtered by search query
  searchResults: FuseResult<GroupData>[];

  // pagination and sorting
  currentPage: number;
  totalPages: number;
  sortBy: TradePoolFilterStates;

  // user native sol balance
  nativeSolBalance: number;

  // wallet state
  wallet: Wallet | null;
  connection: Connection | null;

  // user data
  portfolio: Portfolio | null;
  referralCode: string | null;

  /* Actions */
  // fetch groups / banks
  fetchTradeState: ({
    connection,
    wallet,
    refresh,
  }: {
    connection?: Connection;
    wallet?: Wallet;
    refresh?: boolean;
  }) => Promise<void>;
  refreshGroup: ({
    groupPk,
    connection,
    wallet,
  }: {
    groupPk: PublicKey;
    connection?: Connection;
    wallet?: Wallet;
  }) => Promise<void>;
  setIsRefreshingStore: (isRefreshing: boolean) => void;
  searchBanks: (searchQuery: string) => void;
  resetSearchResults: () => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (sortBy: TradePoolFilterStates) => void;
  resetUserData: () => void;
};

const { programId } = getConfig();

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

let fuse: Fuse<GroupData> | null = null;

function createTradeStore() {
  return create<TradeStoreState>(stateCreator);
}

const stateCreator: StateCreator<TradeStoreState, [], []> = (set, get) => ({
  initialized: false,
  userDataFetched: false,
  isRefreshingStore: false,
  groupsCache: {},
  tokenMetadataCache: {},
  bankMetadataCache: {},
  groupMap: new Map<string, GroupData>(),
  searchResults: [],
  currentPage: 1,
  totalPages: 0,
  sortBy: TradePoolFilterStates.PRICE_MOVEMENT_DESC,
  activeGroup: null,
  nativeSolBalance: 0,
  tokenAccountMap: null,
  connection: null,
  wallet: null,
  portfolio: null,
  referralCode: null,

  setIsRefreshingStore: (isRefreshing) => {
    set((state) => {
      return {
        ...state,
        isRefreshingStore: isRefreshing,
      };
    });
  },

  fetchTradeState: async (args) => {
    try {
      // fetch groups
      let userDataFetched = false;

      const connection = args.connection ?? get().connection;
      const argWallet = args.wallet;
      const storeWallet = get().wallet;
      const dummyWallet = {
        publicKey: PublicKey.default,
        signMessage: (arg: any) => {},
        signTransaction: (arg: any) => {},
        signAllTransactions: (arg: any) => {},
      } as Wallet;

      const wallet =
        argWallet && argWallet.publicKey ? argWallet : storeWallet && storeWallet.publicKey ? storeWallet : dummyWallet;
      if (!connection) throw new Error("Connection not found");

      let { tokenMetadataCache, bankMetadataCache, groupsCache } = get();

      if (
        !Object.keys(tokenMetadataCache).length ||
        !Object.keys(bankMetadataCache).length ||
        !Object.keys(groupsCache).length
      ) {
        try {
          groupsCache = await fetch(TRADE_GROUPS_MAP).then((res) => res.json());
          tokenMetadataCache = await loadTokenMetadatas(TOKEN_METADATA_MAP);
          bankMetadataCache = await loadBankMetadatas(BANK_METADATA_MAP);
        } catch (error) {
          console.error(error);
          return;
        }

        set({ groupsCache, tokenMetadataCache, bankMetadataCache });
      }

      const groups = Object.keys(groupsCache).map((group) => new PublicKey(group));
      const groupMap = get().groupMap;
      const allBanks: ExtendedBankInfo[] = [];

      const mintDatas: Map<string, MintData> = new Map();

      await Promise.all(
        groups.map(async (group) => {
          const bankKeys = groupsCache[group.toBase58()].map((bank) => new PublicKey(bank));

          const { groupData, extendedBankInfos, marginfiClient } = await getGroupData({
            groupPk: group,
            wallet,
            connection,
            bankKeys,
            bankMetadataCache,
            tokenMetadataCache,
          });

          for (const [k, v] of marginfiClient.mintDatas) {
            mintDatas.set(k, v);
          }

          allBanks.push(...extendedBankInfos);

          groupMap.set(group.toBase58(), groupData);
        })
      );

      let nativeSolBalance = 0;
      let tokenAccountMap: TokenAccountMap | null = null;
      let portfolio: Portfolio | null = null;
      let referralCode = get().referralCode;

      if (!wallet.publicKey.equals(PublicKey.default)) {
        const [tData] = await Promise.all([
          fetchTokenAccounts(
            connection,
            wallet.publicKey,
            allBanks.map((bank) => ({
              mint: bank.info.rawBank.mint,
              mintDecimals: bank.info.rawBank.mintDecimals,
              bankAddress: bank.info.rawBank.address,
            })),
            mintDatas
          ),
        ]);

        nativeSolBalance = tData.nativeSolBalance;
        tokenAccountMap = tData.tokenAccountMap;

        for (const [id, group] of groupMap) {
          const updatedPool = await getUpdatedGroupPool({ group, tokenAccountMap, nativeSolBalance });
          groupMap.set(id, { ...group, pool: updatedPool });
        }

        portfolio = getPorfolioData(groupMap);
        userDataFetched = true;

        // fetch / create referral code
        // if (!referralCode) {
        //   const referralCodeRes = await fetch(`/api/user/referral/get-code`, {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
        //   });

        //   if (!referralCodeRes.ok) {
        //     console.error("Error fetching referral code");
        //   } else {
        //     const referralCodeData = await referralCodeRes.json();
        //     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.thearena.trade";
        //     referralCode = `${baseUrl}/refer/${referralCodeData.referralCode}`;
        //   }
        // }
      }

      const sortedGroups = sortGroups(groupMap, get().sortBy, groupsCache);
      const totalPages = Math.ceil(groupMap.entries.length / POOLS_PER_PAGE);
      const currentPage = get().currentPage || 1;

      fuse = new Fuse([...groupMap.values()], {
        includeScore: true,
        threshold: 0.2,
        keys: [
          {
            name: "pool.token.meta.tokenSymbol",
            weight: 0.7,
          },
          {
            name: "pool.token.meta.tokenName",
            weight: 0.3,
          },
          {
            name: "pool.token.info.state.mint.toBase58()",
            weight: 0.1,
          },
        ],
      });

      set({
        initialized: true,
        groupsCache: groupsCache,
        groupMap: sortedGroups,
        totalPages,
        currentPage,
        nativeSolBalance,
        tokenAccountMap,
        wallet,
        connection,
        userDataFetched,
        portfolio,
        referralCode,
      });
    } catch (error) {
      console.error(error);
    }
  },

  refreshGroup: async (args: { groupPk: PublicKey; connection?: Connection; wallet?: Wallet }) => {
    try {
      const connection = args.connection ?? get().connection;
      const wallet = args?.wallet ?? get().wallet;
      const activeGroup = args.groupPk;
      const groupMap = get().groupMap;

      if (!activeGroup) throw new Error("No group to refresh");
      if (!groupMap) throw new Error("Groups not fetched");
      if (!connection) throw new Error("Connection not found");
      if (!wallet) throw new Error("Wallet not found");
      const { groupsCache, tokenMetadataCache, bankMetadataCache } = get();

      const bankKeys = groupsCache[activeGroup.toBase58()].map((bank) => new PublicKey(bank));
      const { groupData, extendedBankInfos, marginfiClient } = await getGroupData({
        groupPk: activeGroup,
        wallet,
        connection,
        bankKeys,
        bankMetadataCache,
        tokenMetadataCache,
      });

      let portfolio: Portfolio | null = null;

      groupMap.set(activeGroup.toBase58(), groupData);

      if (!wallet.publicKey.equals(PublicKey.default)) {
        const [tokenData] = await Promise.all([
          fetchTokenAccounts(
            connection,
            wallet.publicKey,
            extendedBankInfos.map((bank) => ({
              mint: bank.info.rawBank.mint,
              mintDecimals: bank.info.rawBank.mintDecimals,
              bankAddress: bank.info.rawBank.address,
            })),
            marginfiClient.mintDatas
          ),
        ]);

        const nativeSolBalance = tokenData.nativeSolBalance;
        const tokenAccountMap = tokenData.tokenAccountMap;

        const updatedPool = await getUpdatedGroupPool({ group: groupData, tokenAccountMap, nativeSolBalance });
        groupMap.set(activeGroup.toBase58(), { ...groupData, pool: updatedPool });

        portfolio = getPorfolioData(groupMap);
      }

      set({
        portfolio,
        groupMap,
        wallet: wallet,
        connection: connection,
      });
    } catch (error) {
      console.error(error);
    }
  },

  searchBanks: (searchQuery: string) => {
    if (!fuse) return;
    const searchResults = fuse.search(searchQuery);

    set((state) => {
      return {
        ...state,
        searchResults,
      };
    });
  },

  resetSearchResults: () => {
    set((state) => {
      return {
        ...state,
        searchResults: [],
      };
    });
  },

  setCurrentPage: (page: number) => {
    set((state) => {
      return {
        ...state,
        currentPage: page,
      };
    });
  },

  setSortBy: (sortBy: TradePoolFilterStates) => {
    const groupMap = sortGroups(get().groupMap, sortBy, get().groupsCache);
    set((state) => {
      return {
        ...state,
        sortBy,
        groupMap,
      };
    });
  },

  resetUserData: () => {
    const groups = [...get().groupMap.values()];
    const updatedGroups = groups.map((group) => ({
      ...group,
      pool: {
        ...group.pool,
        quoteTokens: group.pool.quoteTokens.map((quoteToken) => ({
          ...quoteToken,
          userInfo: {
            tokenAccount: {
              created: false,
              mint: quoteToken.info.state.mint,
              balance: 0,
            },
            maxDeposit: 0,
            maxRepay: 0,
            maxWithdraw: 0,
            maxBorrow: 0,
          },
        })),
        token: {
          ...group.pool.token,
          userInfo: {
            tokenAccount: {
              created: false,
              mint: group.pool.token.info.state.mint,
              balance: 0,
            },
            maxDeposit: 0,
            maxRepay: 0,
            maxWithdraw: 0,
            maxBorrow: 0,
          },
        },
      },
    }));

    // update groupMap stored on state with the updated group data above
    const groupMap = new Map(updatedGroups.map((group) => [group.client.group.address.toBase58(), group]));
    set({
      groupMap,
      portfolio: null,
      nativeSolBalance: 0,
      tokenAccountMap: null,
      wallet: null,
      userDataFetched: false,
    });
  },
});

const sortGroups = (groupMap: Map<string, GroupData>, sortBy: TradePoolFilterStates, groupsCache: TradeGroupsCache) => {
  const groups = [...groupMap.values()];
  const timestampOrder = Object.keys(groupsCache).reverse();

  const sortedGroups = groups.sort((a, b) => {
    if (sortBy === TradePoolFilterStates.TIMESTAMP) {
      const aIndex = timestampOrder.indexOf(a.client.group.address.toBase58());
      const bIndex = timestampOrder.indexOf(b.client.group.address.toBase58());
      return aIndex - bIndex;
    } else if (sortBy.startsWith("price-movement")) {
      const aPrice = Math.abs(a.pool.token.tokenData?.priceChange24hr ?? 0);
      const bPrice = Math.abs(b.pool.token.tokenData?.priceChange24hr ?? 0);
      return sortBy === TradePoolFilterStates.PRICE_MOVEMENT_ASC ? aPrice - bPrice : bPrice - aPrice;
    } else if (sortBy.startsWith("market-cap")) {
      const aMarketCap = a.pool.token.tokenData?.marketCap ?? 0;
      const bMarketCap = b.pool.token.tokenData?.marketCap ?? 0;
      return sortBy === TradePoolFilterStates.MARKET_CAP_ASC ? aMarketCap - bMarketCap : bMarketCap - aMarketCap;
    } else if (sortBy.startsWith("liquidity")) {
      const aLiquidity = a.pool.poolData?.totalLiquidity ?? 0;
      const bLiquidity = b.pool.poolData?.totalLiquidity ?? 0;
      return sortBy === TradePoolFilterStates.LIQUIDITY_ASC ? aLiquidity - bLiquidity : bLiquidity - aLiquidity;
    } else if (sortBy.startsWith("apy")) {
      const getHighestLendingRate = (group: GroupData) => {
        const rates = [
          group.pool.token.info.state.lendingRate,
          ...group.pool.quoteTokens.map((bank) => bank.info.state.lendingRate),
        ];
        return Math.max(...rates);
      };

      const aHighestRate = getHighestLendingRate(a);
      const bHighestRate = getHighestLendingRate(b);
      return sortBy === TradePoolFilterStates.APY_ASC ? aHighestRate - bHighestRate : bHighestRate - aHighestRate;
    }

    return 0;
  });

  const sortedGroupMap = new Map<string, GroupData>();

  sortedGroups.forEach((group) => {
    sortedGroupMap.set(group.client.group.address.toBase58(), group);
  });

  return sortedGroupMap;
};

async function getGroupData({
  groupPk,
  wallet,
  connection,
  bankKeys,
  bankMetadataCache,
  tokenMetadataCache,
}: {
  groupPk: PublicKey;
  wallet: Wallet;
  connection: Connection;
  bankKeys: PublicKey[];
  bankMetadataCache: {
    [symbol: string]: BankMetadata;
  };
  tokenMetadataCache: {
    [address: string]: TokenMetadata;
  };
}) {
  const marginfiClient = await MarginfiClient.fetch(
    {
      environment: "production",
      cluster: "mainnet",
      programId,
      groupPk,
    },
    wallet,
    connection,
    {
      preloadedBankAddresses: bankKeys,
      bankMetadataMap: bankMetadataCache,
      processTransactionStrategy: getTransactionStrategy(),
      fetchGroupDataOverride: fetchGroupData,
    }
  );

  let groupData: GroupData = {
    groupPk,
    pool: {} as any,
    client: marginfiClient,
    marginfiAccounts: [],
    selectedAccount: null,
    accountSummary: DEFAULT_ACCOUNT_SUMMARY,
  };

  const banksIncludingUSDC = Array.from(marginfiClient.banks.values());
  const banksWithPriceAndToken: {
    bank: Bank;
    oraclePrice: OraclePrice;
    tokenMetadata: TokenMetadata;
  }[] = [];

  banksIncludingUSDC.forEach((bank) => {
    const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
    if (!oraclePrice) {
      return;
    }

    const bankMetadata = bankMetadataCache[bank.address.toBase58()];
    if (bankMetadata === undefined) {
      return;
    }

    try {
      const tokenMetadata = getValueInsensitive(tokenMetadataCache, bankMetadata.tokenSymbol);
      if (!tokenMetadata) {
        return;
      }

      banksWithPriceAndToken.push({ bank, oraclePrice, tokenMetadata });
    } catch (err) {
      console.error("error fetching token metadata: ", err);
    }
  });

  const extendedBankInfos = await Promise.all(
    banksWithPriceAndToken.map(async ({ bank, oraclePrice, tokenMetadata }) => {
      const extendedBankInfo = makeExtendedBankInfo(tokenMetadata, bank, oraclePrice);
      const address = bank.mint.toBase58();
      const tokenResponse = await fetch(`/api/birdeye/token?address=${address}`);

      if (!tokenResponse.ok) {
        console.error("Failed to fetch token data");
        return extendedBankInfo;
      }

      const tokenData = (await tokenResponse.json()) as TokenData;

      if (!tokenData) {
        console.error("Failed to parse token data");
      }

      const extendedArenaBank = {
        ...extendedBankInfo,
        tokenData: {
          price: tokenData.price,
          priceChange24hr: tokenData.priceChange24h,
          volume24hr: tokenData.volume24h,
          volumeChange24hr: tokenData.volumeChange24h,
          marketCap: tokenData.marketcap,
        },
      } as ArenaBank;

      return extendedArenaBank;
    })
  );

  // change this logic when adding more collateral banks
  const tokenBanks = extendedBankInfos.filter(
    (bank) => !bank.info.rawBank.mint.equals(USDC_MINT) && !bank.info.rawBank.mint.equals(LST_MINT)
  );
  const collateralBanks = extendedBankInfos.filter(
    (bank) => bank.info.rawBank.mint.equals(USDC_MINT) || bank.info.rawBank.mint.equals(LST_MINT)
  );

  if (tokenBanks.length > 1) console.error("Inconsitency in token banks!");

  const totalTokenLiquidity = tokenBanks.reduce(
    (total, bank) => total + bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber(),
    0
  );

  const totalCollateralLiquidity = collateralBanks.reduce(
    (total, bank) => total + bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber(),
    0
  );

  groupData.pool = {
    token: tokenBanks[0],
    quoteTokens: collateralBanks,
    poolData: {
      totalLiquidity: totalTokenLiquidity + totalCollateralLiquidity,
    },
  };

  if (!wallet.publicKey.equals(PublicKey.default)) {
    const mfiAccounts = await marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey);
    const mfiAccount = mfiAccounts[0];

    groupData.marginfiAccounts = mfiAccounts;
    groupData.selectedAccount = mfiAccount;

    if (mfiAccount) groupData.accountSummary = computeAccountSummary(mfiAccount, [...tokenBanks, ...collateralBanks]);
  }

  return { groupData, extendedBankInfos, marginfiClient };
}

async function getUpdatedGroupPool({
  group,
  tokenAccountMap,
  nativeSolBalance,
}: {
  group: GroupData;
  tokenAccountMap: TokenAccountMap;
  nativeSolBalance: number;
}) {
  const updateBank = (bank: ArenaBank) => {
    const tokenAccount = tokenAccountMap?.get(bank.info.rawBank.mint.toBase58());
    if (!tokenAccount) return bank;

    const updatedBankInfo = makeExtendedBankInfo(
      { icon: bank.meta.tokenLogoUri, name: bank.meta.tokenName, symbol: bank.meta.tokenSymbol },
      bank.info.rawBank,
      bank.info.oraclePrice,
      undefined,
      {
        nativeSolBalance,
        marginfiAccount: group.selectedAccount,
        tokenAccount,
      }
    );

    return {
      ...updatedBankInfo,
      tokenData: bank.tokenData,
    };
  };

  const updatedPool = {
    ...group.pool,
    token: updateBank(group.pool.token),
    quoteTokens: group.pool.quoteTokens.map(updateBank),
  };

  return updatedPool;
}

function getPorfolioData(groupMap: Map<string, GroupData>) {
  const longPositions: GroupData[] = [];
  const shortPositions: GroupData[] = [];
  const lpPositions: GroupData[] = [];

  let portfolio: Portfolio | null = null;

  groupMap.forEach((group) => {
    const tokenBank = group.pool.token;
    const quoteTokens = group.pool.quoteTokens;

    let isLpPosition = true;
    let hasAnyPosition = false;
    let isLendingInAny = false;
    let isLong = false;
    let isShort = false;

    if (tokenBank.isActive && tokenBank.position) {
      hasAnyPosition = true;
      if (tokenBank.position.isLending) {
        isLendingInAny = true;
      } else if (tokenBank.position.usdValue > 0) {
        isShort = true;
        isLpPosition = false;
      }
    }

    quoteTokens.forEach((quoteToken) => {
      if (quoteToken.isActive && quoteToken.position) {
        hasAnyPosition = true;
        if (quoteToken.position.isLending) {
          isLendingInAny = true;
        } else if (quoteToken.position.usdValue > 0) {
          if (tokenBank.isActive && tokenBank.position && tokenBank.position.isLending) {
            isLong = true;
          }
          isLpPosition = false;
        }
      }
    });

    const positionInfo = getGroupPositionInfo({ group });

    if (positionInfo === "LP") {
      lpPositions.push(group);
    } else if (positionInfo === "LONG") {
      longPositions.push(group);
    } else if (positionInfo === "SHORT") {
      shortPositions.push(group);
    }
  });

  const sortGroupsByUsdValue = (groups: GroupData[]) =>
    groups.sort((a, b) => {
      const aValue = a.pool.token.isActive && a.pool.token.position ? a.pool.token.position.usdValue : 0;
      const bValue = b.pool.token.isActive && b.pool.token.position ? b.pool.token.position.usdValue : 0;
      return bValue - aValue;
    });

  if (longPositions.length > 0 || shortPositions.length > 0 || lpPositions.length > 0) {
    portfolio = {
      long: sortGroupsByUsdValue(longPositions),
      short: sortGroupsByUsdValue(shortPositions),
      lpPositions: lpPositions,
    };
  }

  return portfolio;
}

export { createTradeStore };
export type { TradeStoreState };

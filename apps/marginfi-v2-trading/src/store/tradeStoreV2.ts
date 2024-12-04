import { create, StateCreator } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@coral-xyz/anchor";
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
  TokenAccount,
} from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiClient,
  getConfig,
  Bank,
  OraclePrice,
  MarginfiAccountWrapper,
  MintData,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
  BankRaw,
  MarginfiGroup,
  MarginfiAccount,
} from "@mrgnlabs/marginfi-client-v2";
import {
  Wallet,
  TokenMetadata,
  loadTokenMetadatas,
  loadBankMetadatas,
  getValueInsensitive,
  BankMetadata,
  LST_MINT,
  chunkedGetRawMultipleAccountInfoOrdered,
} from "@mrgnlabs/mrgn-common";

import { TRADE_GROUPS_MAP, TOKEN_METADATA_MAP, BANK_METADATA_MAP, POOLS_PER_PAGE } from "~/config/trade";
import { TokenData } from "~/types";
import { getGroupPositionInfo } from "~/utils";
import { getTransactionStrategy } from "@mrgnlabs/mrgn-utils";
import BigNumber from "bignumber.js";

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

// export type TokenData = {
//   price: number;
//   priceChange24hr: number;
//   volume24hr: number;
//   volumeChange24hr: number;
//   marketCap: number;
// };

// new types
export interface BankData {
  totalDeposits: number;
  totalBorrows: number;
  availableLiquidity: number;
}

export type BankSummary = {
  bankPk: PublicKey;
  mint: PublicKey;
  tokenName: string;
  tokenSymbol: string;
  tokenLogoUri: string;

  bankData: BankData;
  tokenData: TokenData;
};

export type ArenaPoolSummary = {
  groupPk: PublicKey;
  quoteSummary: BankSummary;
  tokenSummary: BankSummary;
};

export enum GroupStatus {
  LP = "lp",
  LONG = "long",
  SHORT = "short",
  EMPTY = "empty",
}

export type ArenaPoolV2 = {
  groupPk: PublicKey;
  tokenBankPk: PublicKey;
  quoteBankPk: PublicKey;
  status: GroupStatus;
};

// api calls

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

type TradeStoreV2State = {
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

  // new objects
  arenaPoolsSummary: Record<string, ArenaPoolSummary>;
  arenaPools: Record<string, ArenaPoolV2>;
  groupsByGroupPk: Record<string, MarginfiGroup>;
  banksByBankPk: Record<string, ArenaBank>;
  tokenDataByMint: Record<string, TokenData>;

  // user token account map
  tokenAccountMap: TokenAccountMap | null;

  // fuse
  arenaPoolsSummaryFuse: Fuse<ArenaPoolSummary> | null;
  arenaPoolsFuse: Fuse<ArenaPoolV2> | null;

  // array of banks filtered by search query
  searchPoolSummaryResults: FuseResult<ArenaPoolSummary>[];
  searchPoolResults: FuseResult<ArenaPoolV2>[];

  // pagination and sorting
  currentPage: number;
  totalPages: number;
  sortBy: TradePoolFilterStates;

  // user native sol balance
  nativeSolBalance: number;

  // wallet state
  wallet: Wallet;
  connection: Connection | null;

  // user data
  // portfolio: Portfolio | null;
  referralCode: string | null;

  /* Actions */
  // fetch arena group summary
  fetchArenaGroups: () => Promise<void>;
  fetchExtendedArenaGroups: ({
    connection,
    wallet,
    refresh,
  }: {
    connection?: Connection;
    wallet?: Wallet;
    refresh?: boolean;
  }) => Promise<void>;

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
  searchSummaryPools: (searchQuery: string) => void;
  searchPools: (searchQuery: string) => void;
  resetSearchResults: () => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (sortBy: TradePoolFilterStates) => void;
  resetUserData: () => void;
};

const { programId } = getConfig();

// let fuse: Fuse<ArenaPoolSummary> | null = null;

function createTradeStoreV2() {
  return create<TradeStoreV2State>(stateCreator);
}

const stateCreator: StateCreator<TradeStoreV2State, [], []> = (set, get) => ({
  initialized: false,
  userDataFetched: false,
  isRefreshingStore: false,
  groupsCache: {},
  tokenMetadataCache: {},
  bankMetadataCache: {},
  searchResults: [],
  currentPage: 1,
  totalPages: 0,
  sortBy: TradePoolFilterStates.PRICE_MOVEMENT_DESC,
  activeGroup: null,
  nativeSolBalance: 0,
  tokenAccountMap: null,
  connection: null,
  wallet: {
    publicKey: PublicKey.default,
    signMessage: (arg: any) => {},
    signTransaction: (arg: any) => {},
    signAllTransactions: (arg: any) => {},
  } as Wallet,
  portfolio: null,
  referralCode: null,

  arenaPoolsSummary: {},
  arenaPools: {},
  groupsByGroupPk: {},
  banksByBankPk: {},
  tokenDataByMint: {},
  arenaPoolsSummaryFuse: null,
  arenaPoolsFuse: null,
  searchPoolSummaryResults: [],
  searchPoolResults: [],

  setIsRefreshingStore: (isRefreshing) => {
    set((state) => {
      return {
        ...state,
        isRefreshingStore: isRefreshing,
      };
    });
  },

  fetchArenaGroups: async () => {
    let { tokenMetadataCache, bankMetadataCache, groupsCache } = get();

    if (
      !Object.keys(tokenMetadataCache).length ||
      !Object.keys(bankMetadataCache).length ||
      !Object.keys(groupsCache).length
    ) {
      try {
        // Fetch all data in parallel using Promise.all
        const [groupsData, tokenData, bankData] = await Promise.all([
          fetch(TRADE_GROUPS_MAP).then((res) => res.json()),
          loadTokenMetadatas(TOKEN_METADATA_MAP),
          loadBankMetadatas(BANK_METADATA_MAP),
        ]);

        groupsCache = groupsData;
        tokenMetadataCache = tokenData;
        bankMetadataCache = bankData;

        set({ groupsCache, tokenMetadataCache, bankMetadataCache });
      } catch (error) {
        console.error("Failed to fetch cache data:", error);
        return;
      }
    }

    const allBankMints = [...new Set(Object.values(bankMetadataCache).map((bank) => bank.tokenAddress))];
    const bankSummaryByGroup: PoolSummaryByGroupResponse = await fetch("/api/pool/summary").then((res) => res.json());
    const tokenDetails: TokenData[] = await Promise.all(
      allBankMints.map((mint) => fetch(`/api/birdeye/token?address=${mint}`).then((res) => res.json()))
    );

    const tokenDetailsByMint = tokenDetails.reduce((acc, detail, index) => {
      acc[allBankMints[index]] = detail;
      return acc;
    }, {} as Record<string, TokenData>);

    const groupSummaryByGroup: Record<string, ArenaPoolSummary> = Object.entries(bankSummaryByGroup).reduce(
      (acc, [groupPk, summary]) => {
        const { bankPk: quoteBankPk, mint: quoteMint, ...quoteBankData } = summary.quoteBankSummary;
        const { bankPk: tokenBankPk, mint: tokenMint, ...tokenBankData } = summary.tokenBankSummary;
        const tokenDetailsQuote = tokenDetailsByMint[quoteMint];
        const tokenDetailsToken = tokenDetailsByMint[tokenMint];

        acc[groupPk] = {
          groupPk: new PublicKey(groupPk),
          tokenSummary: {
            bankPk: new PublicKey(tokenBankPk),
            mint: new PublicKey(tokenMint),
            tokenName: tokenDetailsToken.name,
            tokenSymbol: tokenDetailsToken.symbol,
            bankData: tokenBankData,
            tokenData: tokenDetailsToken,
            tokenLogoUri: `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${tokenMint}.png`,
          },
          quoteSummary: {
            bankPk: new PublicKey(quoteBankPk),
            mint: new PublicKey(quoteMint),
            tokenName: tokenDetailsQuote.name,
            tokenSymbol: tokenDetailsQuote.symbol,
            bankData: quoteBankData,
            tokenData: tokenDetailsQuote,
            tokenLogoUri: `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${quoteMint}.png`,
          },
        };
        return acc;
      },
      {} as Record<string, ArenaPoolSummary>
    );

    const sortedGroups = sortPools(groupSummaryByGroup, tokenDetailsByMint, get().sortBy, groupsCache);

    const totalPages = Math.ceil(Object.keys(sortedGroups).length / POOLS_PER_PAGE);
    const currentPage = get().currentPage || 1;

    const fuse = new Fuse([...Object.values(sortedGroups)], {
      includeScore: true,
      threshold: 0.2,
      keys: [
        {
          name: "tokenSummary.tokenSymbol",
          weight: 0.7,
        },
        {
          name: "tokenSummary.tokenName",
          weight: 0.3,
        },
        {
          name: "tokenSummary.mint.toBase58()",
          weight: 0.1,
        },
      ],
    });

    set({
      arenaPoolsSummary: sortedGroups,
      tokenDataByMint: tokenDetailsByMint,
      arenaPoolsSummaryFuse: fuse,
      initialized: true,
      totalPages,
      currentPage,
    });
  },

  fetchExtendedArenaGroups: async (args) => {
    const connection = args.connection || get().connection;
    const wallet = args.wallet || get().wallet;
    const { tokenDataByMint, tokenMetadataCache, bankMetadataCache, groupsCache, arenaPoolsSummary } = get();

    if (!connection) throw new Error("Connection not found");
    if (!Object.keys(arenaPoolsSummary).length || !Object.keys(tokenDataByMint).length) {
      throw new Error("Not ready");
    }

    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: programId.toBase58() };
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const bankAddresses: PublicKey[] = [];
    let bankDatasKeyed: { address: PublicKey; data: BankRaw }[] = [];

    const groupAddresses: PublicKey[] = [];

    for (const group of Object.values(arenaPoolsSummary)) {
      bankAddresses.push(group.tokenSummary.bankPk, group.quoteSummary.bankPk);
      groupAddresses.push(group.groupPk);
    }

    let bankAccountsData = await program.account.bank.fetchMultiple(bankAddresses);
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] !== null) {
        bankDatasKeyed.push({
          address: bankAddresses[i],
          data: bankAccountsData[i] as any as BankRaw,
        });
      }
    }

    const [feedIdMap, oraclePrices] = await Promise.all([fetchPythFeedMap(), fetchOraclePrices()]);

    const mintKeys = bankDatasKeyed.map((b) => b.data.mint);
    const emissionMintKeys = bankDatasKeyed
      .map((b) => b.data.emissionsMint)
      .filter((pk) => !pk.equals(PublicKey.default)) as PublicKey[];

    // Batch-fetch the group account and all the oracle accounts as per the banks retrieved above
    const allAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
      ...groupAddresses.map((pk) => pk.toBase58()),
      ...mintKeys.map((pk) => pk.toBase58()),
      ...emissionMintKeys.map((pk) => pk.toBase58()),
    ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank

    const groupAis = allAis.splice(0, groupAddresses.length);
    const mintAis = allAis.splice(0, mintKeys.length);
    const emissionMintAis = allAis.splice(0);

    const marginfiGroups = groupAis.map((groupAi, index) => {
      const groupAddress = groupAddresses[index];
      if (!groupAddress) throw new Error(`Failed to fetch group data for ${groupAddresses[index]}`);
      return MarginfiGroup.fromBuffer(groupAddress, groupAi.data, program.idl);
    });

    const banks = new Map(
      bankDatasKeyed.map(({ address, data }) => {
        const bankMetadata = bankMetadataCache ? bankMetadataCache[address.toBase58()] : undefined;
        const bank = Bank.fromAccountParsed(address, data, feedIdMap, bankMetadata);

        return [address.toBase58(), bank];
      })
    );

    const tokenDatas = new Map(
      bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
        const mintAddress = mintKeys[index];
        const mintDataRaw = mintAis[index];
        if (!mintDataRaw) throw new Error(`Failed to fetch mint account for bank ${bankAddress.toBase58()}`);
        let emissionTokenProgram: PublicKey | null = null;
        if (!bankData.emissionsMint.equals(PublicKey.default)) {
          const emissionMintDataRawIndex = emissionMintKeys.findIndex((pk) => pk.equals(bankData.emissionsMint));
          emissionTokenProgram = emissionMintDataRawIndex >= 0 ? emissionMintAis[emissionMintDataRawIndex].owner : null;
        }
        // TODO: parse extension data to see if there is a fee
        return [
          bankAddress.toBase58(),
          { mint: mintAddress, tokenProgram: mintDataRaw.owner, feeBps: 0, emissionTokenProgram },
        ];
      })
    );

    const priceInfos = new Map(
      bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
        const priceData = oraclePrices[index];
        if (!priceData) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
        return [bankAddress.toBase58(), priceData as OraclePrice];
      })
    );

    const banksWithPriceAndToken: {
      bank: Bank;
      oraclePrice: OraclePrice;
      tokenMetadata: TokenMetadata;
    }[] = [];

    banks.forEach((bank) => {
      const oraclePrice = priceInfos.get(bank.address.toBase58());
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

    let extendedBankInfos = banksWithPriceAndToken.map(({ bank, oraclePrice, tokenMetadata }) => {
      const extendedBankInfo = makeExtendedBankInfo(tokenMetadata, bank, oraclePrice);
      const mintAddress = bank.mint.toBase58();
      const tokenData = tokenDataByMint[mintAddress];
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
    });

    let nativeSolBalance = 0;
    let tokenAccountMap: TokenAccountMap | null = null;

    if (wallet.publicKey && !wallet.publicKey.equals(PublicKey.default)) {
      const [tokenAccounts] = await Promise.all([
        fetchTokenAccounts(
          connection,
          wallet.publicKey,
          Object.values(banks).map((bank) => ({
            mint: bank.info.rawBank.mint,
            mintDecimals: bank.info.rawBank.mintDecimals,
            bankAddress: bank.info.rawBank.address,
          })),
          tokenDatas
        ),
      ]);

      nativeSolBalance = tokenAccounts.nativeSolBalance;
      tokenAccountMap = tokenAccounts.tokenAccountMap;

      const marginfiAccountsByGroupPk = new Map<string, MarginfiAccount>();

      const accounts = await program.account.marginfiAccount.all([
        {
          memcmp: {
            bytes: wallet.publicKey.toBase58(),
            offset: 8 + 32,
          },
        },
      ]);

      accounts.forEach((a) => {
        const groupKey = a.account.group.toBase58();
        const account = new MarginfiAccount(a.publicKey, a.account);
        const existingAccount = marginfiAccountsByGroupPk.get(groupKey);

        if (existingAccount) {
          const isUpdateAccount = existingAccount.activeBalances.length < account.activeBalances.length;

          if (isUpdateAccount) {
            marginfiAccountsByGroupPk.set(groupKey, account);
          }
        } else {
          marginfiAccountsByGroupPk.set(groupKey, account);
        }
      });

      extendedBankInfos = extendedBankInfos.map((bankInfo) => {
        const marginfiAccount = marginfiAccountsByGroupPk.get(bankInfo.info.rawBank.group.toBase58()) ?? null;
        const tokenAccount = tokenAccountMap?.get(bankInfo.info.rawBank.mint.toBase58());

        return updateBank(bankInfo, nativeSolBalance, marginfiAccount, banks, priceInfos, tokenAccount);
      });
    }

    const arenaPools: Record<string, ArenaPoolV2> = {};

    Object.entries(arenaPoolsSummary).map(([groupPk, group]) => {
      const tokenBank = extendedBankInfos.find((b) => b.info.rawBank.address.equals(group.tokenSummary.bankPk));
      const quoteBank = extendedBankInfos.find((b) => b.info.rawBank.address.equals(group.quoteSummary.bankPk));

      if (!tokenBank || !quoteBank) {
        throw new Error(`Failed to find token or quote bank for group ${groupPk}`);
      }

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

      if (quoteBank.isActive && quoteBank.position) {
        hasAnyPosition = true;
        if (quoteBank.position.isLending) {
          isLendingInAny = true;
        } else if (quoteBank.position.usdValue > 0) {
          if (tokenBank.isActive && tokenBank.position && tokenBank.position.isLending) {
            isLong = true;
          }
          isLpPosition = false;
        }
      }

      let status = GroupStatus.EMPTY;

      if (hasAnyPosition) {
        if (isLpPosition && isLendingInAny) {
          status = GroupStatus.LP;
        } else if (isLong) {
          status = GroupStatus.LONG;
        } else if (isShort) {
          status = GroupStatus.SHORT;
        }
      }

      const arenaPool: ArenaPoolV2 = {
        groupPk: group.groupPk,
        tokenBankPk: group.tokenSummary.bankPk,
        quoteBankPk: group.quoteSummary.bankPk,
        status,
      };

      arenaPools[groupPk] = arenaPool;
    });

    const banksByBankPk = extendedBankInfos.reduce((acc, bank) => {
      acc[bank.info.rawBank.address.toBase58()] = bank;
      return acc;
    }, {} as Record<string, ArenaBank>);

    const groupsByGroupPk = marginfiGroups.reduce((acc, group) => {
      acc[group.address.toBase58()] = group;
      return acc;
    }, {} as Record<string, MarginfiGroup>);

    set({ arenaPools, banksByBankPk, groupsByGroupPk });

    // fetch all bank data
  },

  fetchTradeState: async (args) => {},

  refreshGroup: async (args: { groupPk: PublicKey; connection?: Connection; wallet?: Wallet }) => {},

  searchSummaryPools: (searchQuery: string) => {
    const fuse = get().arenaPoolsSummaryFuse;
    if (!fuse) return;
    const searchResults = fuse.search(searchQuery);

    set({ searchPoolSummaryResults: searchResults });
  },

  searchPools: (searchQuery: string) => {
    const fuse = get().arenaPoolsFuse;
    if (!fuse) return;
    const searchResults = fuse.search(searchQuery);

    set({ searchPoolResults: searchResults });
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
    const arenaPoolsSummary = sortPools(get().arenaPoolsSummary, get().tokenDataByMint, sortBy, get().groupsCache);
    set((state) => {
      return {
        ...state,
        sortBy,
        arenaPoolsSummary,
      };
    });
  },

  resetUserData: () => {},
});

const sortPools = (
  arenaPools: Record<string, ArenaPoolSummary>,
  tokenDataByMint: Record<string, TokenData>,
  sortBy: TradePoolFilterStates,
  groupsCache: TradeGroupsCache
) => {
  const groups = [...Object.values(arenaPools)];
  const timestampOrder = Object.keys(groupsCache).reverse();

  const sortedGroups = groups.sort((a, b) => {
    const aTokenData = tokenDataByMint[a.tokenSummary.mint.toBase58()];
    const bTokenData = tokenDataByMint[b.tokenSummary.mint.toBase58()];

    if (sortBy === TradePoolFilterStates.TIMESTAMP) {
      const aIndex = timestampOrder.indexOf(a.groupPk.toBase58());
      const bIndex = timestampOrder.indexOf(b.groupPk.toBase58());
      return aIndex - bIndex;
    } else if (sortBy.startsWith("price-movement")) {
      const aPrice = Math.abs(aTokenData.priceChange24h ?? 0);
      const bPrice = Math.abs(bTokenData.priceChange24h ?? 0);
      return sortBy === TradePoolFilterStates.PRICE_MOVEMENT_ASC ? aPrice - bPrice : bPrice - aPrice;
    } else if (sortBy.startsWith("market-cap")) {
      const aMarketCap = aTokenData.marketcap ?? 0;
      const bMarketCap = bTokenData.marketcap ?? 0;
      return sortBy === TradePoolFilterStates.MARKET_CAP_ASC ? aMarketCap - bMarketCap : bMarketCap - aMarketCap;
    } else if (sortBy.startsWith("liquidity")) {
      const aLiquidity = a.tokenSummary.bankData.totalDeposits ?? 0;
      const bLiquidity = b.tokenSummary.bankData.totalDeposits ?? 0;
      return sortBy === TradePoolFilterStates.LIQUIDITY_ASC ? aLiquidity - bLiquidity : bLiquidity - aLiquidity;
    } else if (sortBy.startsWith("apy")) {
      const aIndex = timestampOrder.indexOf(a.groupPk.toBase58());
      const bIndex = timestampOrder.indexOf(b.groupPk.toBase58());
      return aIndex - bIndex;

      // todo add apy filter
      // const getHighestLendingRate = (pool: ArenaPoolSummary) => {
      //   const rates = [
      //     pool.tokenSummary.bankData.lendingRate,
      //     ...group.pool.quoteTokens.map((bank) => bank.info.state.lendingRate),
      //   ];
      //   return Math.max(...rates);
      // };

      // const aHighestRate = getHighestLendingRate(a);
      // const bHighestRate = getHighestLendingRate(b);
      // return sortBy === TradePoolFilterStates.APY_ASC ? aHighestRate - bHighestRate : bHighestRate - aHighestRate;
    }

    return 0;
  });

  const sortedPools: Record<string, ArenaPoolSummary> = {};

  sortedGroups.forEach((group) => {
    sortedPools[group.groupPk.toBase58()] = group;
  });

  return sortedPools;
};

export { createTradeStoreV2 };
export type { TradeStoreV2State };

async function fetchPythFeedMap() {
  const feedIdMapRaw: Record<string, string> = await fetch(`/api/oracle/pythFeedMapV2`).then((response) =>
    response.json()
  );
  const feedIdMap: Map<string, PublicKey> = new Map(
    Object.entries(feedIdMapRaw).map(([key, value]) => [key, new PublicKey(value)])
  );
  return feedIdMap;
}

async function fetchOraclePrices() {
  const response = await fetch(`/api/oracle/priceV2`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch oracle prices");
  }

  const responseBody = await response.json();

  if (!responseBody) {
    throw new Error("Failed to fetch oracle prices");
  }

  const oraclePrices = responseBody.map((oraclePrice: any) => ({
    priceRealtime: {
      price: BigNumber(oraclePrice.priceRealtime.price),
      confidence: BigNumber(oraclePrice.priceRealtime.confidence),
      lowestPrice: BigNumber(oraclePrice.priceRealtime.lowestPrice),
      highestPrice: BigNumber(oraclePrice.priceRealtime.highestPrice),
    },
    priceWeighted: {
      price: BigNumber(oraclePrice.priceWeighted.price),
      confidence: BigNumber(oraclePrice.priceWeighted.confidence),
      lowestPrice: BigNumber(oraclePrice.priceWeighted.lowestPrice),
      highestPrice: BigNumber(oraclePrice.priceWeighted.highestPrice),
    },
    timestamp: oraclePrice.timestamp ? BigNumber(oraclePrice.timestamp) : null,
  })) as OraclePrice[];

  return oraclePrices;
}

// async function getCachedMarginfiAccountsForAuthority(
//   authority: PublicKey,
//   client: MarginfiClient
// ): Promise<MarginfiAccountWrapper[]> {
//   const debug = require("debug")("mfi:getCachedMarginfiAccountsForAuthority");
//   if (typeof window === "undefined") {
//     return client.getMarginfiAccountsForAuthority(authority);
//   }

//   const cacheKey = createLocalStorageKey(authority);
//   const cachedAccountsStr = window.localStorage.getItem(cacheKey);
//   let cachedAccounts: string[] = [];

//   if (cachedAccountsStr) {
//     cachedAccounts = JSON.parse(cachedAccountsStr);
//   }

//   debug("cachedAccounts", cachedAccounts);
//   if (cachedAccounts && cachedAccounts.length > 0) {
//     const accountAddresses: PublicKey[] = cachedAccounts.reduce((validAddresses: PublicKey[], address: string) => {
//       try {
//         const publicKey = new PublicKey(address);
//         validAddresses.push(publicKey);
//         return validAddresses;
//       } catch (error) {
//         console.warn(`Invalid public key: ${address}. Skipping.`);
//         return validAddresses;
//       }
//     }, []);

//     // Update local storage with valid addresses only
//     window.localStorage.setItem(cacheKey, JSON.stringify(accountAddresses.map((addr) => addr.toString())));
//     debug("Loading ", accountAddresses.length, "accounts from cache");
//     return client.getMultipleMarginfiAccounts(accountAddresses);
//   } else {
//     const accounts = await client.getMarginfiAccountsForAuthority(authority);
//     const accountAddresses = accounts.map((account) => account.address.toString());
//     window.localStorage.setItem(cacheKey, JSON.stringify(accountAddresses));
//     return accounts;
//   }
// }

const updateBank = (
  bank: ArenaBank,
  nativeSolBalance: number,
  account: MarginfiAccount | null,
  banks: Map<string, Bank>,
  oraclePrices: Map<string, OraclePrice>,
  tokenAccount?: TokenAccount
) => {
  if (!tokenAccount) return bank;

  const updatedBankInfo = makeExtendedBankInfo(
    { icon: bank.meta.tokenLogoUri, name: bank.meta.tokenName, symbol: bank.meta.tokenSymbol },
    bank.info.rawBank,
    bank.info.oraclePrice,
    undefined,
    {
      nativeSolBalance,
      marginfiAccount: account,
      tokenAccount,
      banks,
      oraclePrices,
    }
  );

  return {
    ...updatedBankInfo,
    tokenData: bank.tokenData,
  };
};

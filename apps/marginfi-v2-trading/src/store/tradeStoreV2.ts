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

// export type TokenData = {
//   price: number;
//   priceChange24hr: number;
//   volume24hr: number;
//   volumeChange24hr: number;
//   marketCap: number;
// };

type Portfolio = {
  long: GroupData[];
  short: GroupData[];
  lpPositions: GroupData[];
} | null;

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
  bankData: BankData;
  tokenData: TokenData;
};

export type ArenaPoolSummary = {
  groupPk: PublicKey;
  quoteSummary: BankSummary;
  tokenSummary: BankSummary;
};

export type ArenaPoolV2 = {
  tokenBankPk: PublicKey;
  quoteBankPks: PublicKey[];
  groupPk: PublicKey;
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

  // new objects
  arenaPoolsSummary: Record<string, ArenaPoolSummary>;
  arenaPools: Record<string, ArenaPoolV2>;
  groupsByGroupPk: Record<string, MarginfiGroup>;
  banksByBankPk: Record<string, ArenaBank>;
  tokenDatasByMint: Record<string, TokenData>;

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
  wallet: Wallet;
  connection: Connection | null;

  // user data
  portfolio: Portfolio | null;
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
  tokenDatasByMint: {},

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
          },
          quoteSummary: {
            bankPk: new PublicKey(quoteBankPk),
            mint: new PublicKey(quoteMint),
            tokenName: tokenDetailsQuote.name,
            tokenSymbol: tokenDetailsQuote.symbol,
            bankData: quoteBankData,
            tokenData: tokenDetailsQuote,
          },
        };
        return acc;
      },
      {} as Record<string, ArenaPoolSummary>
    );

    set({ arenaPoolsSummary: groupSummaryByGroup, tokenDatasByMint: tokenDetailsByMint });
  },

  fetchExtendedArenaGroups: async (args) => {
    const connection = args.connection || get().connection;
    const wallet = args.wallet || get().wallet;
    const { tokenDatasByMint, tokenMetadataCache, bankMetadataCache, groupsCache, arenaPoolsSummary } = get();

    if (!connection) throw new Error("Connection not found");
    if (!Object.keys(arenaPoolsSummary).length || !Object.keys(tokenDatasByMint).length) {
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

    const extendedBankInfos = banksWithPriceAndToken.map(async ({ bank, oraclePrice, tokenMetadata }) => {
      const extendedBankInfo = makeExtendedBankInfo(tokenMetadata, bank, oraclePrice);
      const mintAddress = bank.mint.toBase58();
      const tokenData = tokenDatasByMint[mintAddress];
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

    if (!wallet.publicKey.equals(PublicKey.default)) {
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

      const marginfiAccounts = new Map<string, MarginfiAccount[]>();

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
        const accountList = marginfiAccounts.get(groupKey) || [];
        accountList.push(new MarginfiAccount(a.publicKey, a.account));
        marginfiAccounts.set(groupKey, accountList);
      });
    }

    // set({  extendedBankInfos });

    // fetch all bank data
  },

  fetchTradeState: async (args) => {},

  // fetchTradeState: async (args) => {
  //   try {
  //     // fetch groups
  //     let userDataFetched = false;

  //     const connection = args.connection ?? get().connection;
  //     const argWallet = args.wallet;
  //     const storeWallet = get().wallet;
  //     const dummyWallet = {
  //       publicKey: PublicKey.default,
  //       signMessage: (arg: any) => {},
  //       signTransaction: (arg: any) => {},
  //       signAllTransactions: (arg: any) => {},
  //     } as Wallet;

  //     const wallet =
  //       argWallet && argWallet.publicKey ? argWallet : storeWallet && storeWallet.publicKey ? storeWallet : dummyWallet;
  //     if (!connection) throw new Error("Connection not found");

  //     let { tokenMetadataCache, bankMetadataCache, groupsCache } = get();

  //     if (
  //       !Object.keys(tokenMetadataCache).length ||
  //       !Object.keys(bankMetadataCache).length ||
  //       !Object.keys(groupsCache).length
  //     ) {
  //       try {
  //         groupsCache = await fetch(TRADE_GROUPS_MAP).then((res) => res.json());
  //         tokenMetadataCache = await loadTokenMetadatas(TOKEN_METADATA_MAP);
  //         bankMetadataCache = await loadBankMetadatas(BANK_METADATA_MAP);
  //       } catch (error) {
  //         console.error(error);
  //         return;
  //       }

  //       set({ groupsCache, tokenMetadataCache, bankMetadataCache });
  //     }

  //     const groupSummaries: ArenaGroupSummary[] = [];

  //     const groupsKeys = Object.keys(groupsCache).map((group) => new PublicKey(group));

  //     groupsKeys.forEach((group) => {
  //       const groupCacheData = groupsCache[group.toBase58()];
  //       const tokenBankKey = groupCacheData[0];
  //       const quoteBankKey = groupCacheData[1];

  //       const tokenBankMetadata = bankMetadataCache[tokenBankKey];
  //       const tokenBankSummary: BankSummary = {
  //         bankPk: new PublicKey(tokenBankKey),
  //         mint: new PublicKey(tokenBankMetadata.tokenAddress),
  //         tokenName: tokenBankMetadata.tokenName,
  //         tokenSymbol: tokenBankMetadata.tokenSymbol,
  //         tokenData: {},
  //       };

  //       const quoteBankMetadata = bankMetadataCache[quoteBankKey];
  //     });

  //     // const groups = Object.keys(groupsCache).map((group) => new PublicKey(group));
  //     // const groupMap = get().groupMap;
  //     // const allBanks: ExtendedBankInfo[] = [];

  //     // const mintDatas: Map<string, MintData> = new Map();

  //     // await Promise.all(
  //     //   groups.map(async (group) => {
  //     //     const bankKeys = groupsCache[group.toBase58()].map((bank) => new PublicKey(bank));

  //     //     const { groupData, extendedBankInfos, marginfiClient } = await getGroupData({
  //     //       groupPk: group,
  //     //       wallet,
  //     //       connection,
  //     //       bankKeys,
  //     //       bankMetadataCache,
  //     //       tokenMetadataCache,
  //     //     });

  //     //     for (const [k, v] of marginfiClient.mintDatas) {
  //     //       mintDatas.set(k, v);
  //     //     }

  //     //     allBanks.push(...extendedBankInfos);

  //     //     groupMap.set(group.toBase58(), groupData);
  //     //   })
  //     // );

  //     let nativeSolBalance = 0;
  //     let tokenAccountMap: TokenAccountMap | null = null;
  //     let portfolio: Portfolio | null = null;
  //     let referralCode = get().referralCode;

  //     if (!wallet.publicKey.equals(PublicKey.default)) {
  //       const [tData] = await Promise.all([
  //         fetchTokenAccounts(
  //           connection,
  //           wallet.publicKey,
  //           allBanks.map((bank) => ({
  //             mint: bank.info.rawBank.mint,
  //             mintDecimals: bank.info.rawBank.mintDecimals,
  //             bankAddress: bank.info.rawBank.address,
  //           })),
  //           mintDatas
  //         ),
  //       ]);

  //       nativeSolBalance = tData.nativeSolBalance;
  //       tokenAccountMap = tData.tokenAccountMap;

  //       for (const [id, group] of groupMap) {
  //         const updatedPool = getUpdatedGroupPool({ group, tokenAccountMap, nativeSolBalance });
  //         groupMap.set(id, { ...group, pool: updatedPool });
  //       }

  //       portfolio = getPorfolioData(groupMap);
  //       userDataFetched = true;

  //       // fetch / create referral code
  //       // if (!referralCode) {
  //       //   const referralCodeRes = await fetch(`/api/user/referral/get-code`, {
  //       //     method: "POST",
  //       //     headers: {
  //       //       "Content-Type": "application/json",
  //       //     },
  //       //     body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
  //       //   });

  //       //   if (!referralCodeRes.ok) {
  //       //     console.error("Error fetching referral code");
  //       //   } else {
  //       //     const referralCodeData = await referralCodeRes.json();
  //       //     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.thearena.trade";
  //       //     referralCode = `${baseUrl}/refer/${referralCodeData.referralCode}`;
  //       //   }
  //       // }
  //     }

  //     const sortedGroups = sortGroups(groupMap, get().sortBy, groupsCache);
  //     const totalPages = Math.ceil(groupMap.entries.length / POOLS_PER_PAGE);
  //     const currentPage = get().currentPage || 1;

  //     fuse = new Fuse([...groupMap.values()], {
  //       includeScore: true,
  //       threshold: 0.2,
  //       keys: [
  //         {
  //           name: "pool.token.meta.tokenSymbol",
  //           weight: 0.7,
  //         },
  //         {
  //           name: "pool.token.meta.tokenName",
  //           weight: 0.3,
  //         },
  //         {
  //           name: "pool.token.info.state.mint.toBase58()",
  //           weight: 0.1,
  //         },
  //       ],
  //     });

  //     set({
  //       initialized: true,
  //       groupsCache: groupsCache,
  //       groupMap: sortedGroups,
  //       totalPages,
  //       currentPage,
  //       nativeSolBalance,
  //       tokenAccountMap,
  //       wallet,
  //       connection,
  //       userDataFetched,
  //       portfolio,
  //       referralCode,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //   }
  // },

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
    const searchResults = (fuse as any).search(searchQuery);

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
      wallet: {
        publicKey: PublicKey.default,
        signMessage: (arg: any) => {},
        signTransaction: (arg: any) => {},
        signAllTransactions: (arg: any) => {},
      } as Wallet,
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

function getUpdatedGroupPool({
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

async function fetchPythFeedMap() {
  const feedIdMapRaw: Record<string, string> = await fetch(`/api/oracle/pythFeedMap`).then((response) =>
    response.json()
  );
  const feedIdMap: Map<string, PublicKey> = new Map(
    Object.entries(feedIdMapRaw).map(([key, value]) => [key, new PublicKey(value)])
  );
  return feedIdMap;
}

async function fetchOraclePrices() {
  const response = await fetch(`/api/oracle/price`, {
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

export async function getMarginfiAccountsForAuthority(
  wallet: Wallet,
  connection: Connection
): Promise<MarginfiAccountWrapper[]> {
  const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: programId.toBase58() };
  const provider = new AnchorProvider(connection, wallet, {
    ...AnchorProvider.defaultOptions(),
    commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
  });

  const program = new Program(idl, provider) as any as MarginfiProgram;

  const marginfiAccounts = (
    await program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: wallet.publicKey.toBase58(),
          offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
        },
      },
    ])
  ).map((a) => new MarginfiAccount(a.publicKey, a.account));

  console.log({ marginfiAccounts });
  // marginfiAccounts.sort((accountA, accountB) => {
  //   const assetsValueA = accountA.computeHealthComponents(MarginRequirementType.Equity).assets;
  //   const assetsValueB = accountB.computeHealthComponents(MarginRequirementType.Equity).assets;

  //   if (assetsValueA.eq(assetsValueB)) return 0;
  //   return assetsValueA.gt(assetsValueB) ? -1 : 1;
  // });

  // return marginfiAccounts;
  return [];
}

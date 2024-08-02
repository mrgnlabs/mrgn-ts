import { create, StateCreator } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import Fuse from "fuse.js";
import {
  ExtendedBankInfo,
  makeExtendedBankInfo,
  fetchTokenAccounts,
  TokenAccountMap,
  makeBankInfo,
  makeLendingPosition,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  AccountSummary,
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
} from "@mrgnlabs/mrgn-common";

import { TRADE_GROUPS_MAP, TOKEN_METADATA_MAP, BANK_METADATA_MAP, POOLS_PER_PAGE } from "~/config/trade";
import { TokenData } from "~/types";

type TradeGroupsCache = {
  [group: string]: [string, string];
};

export enum TradePoolFilterStates {
  TIMESTAMP = "timestamp",
  PRICE_ASC = "price-asc",
  PRICE_DESC = "price-desc",
  LONG = "long",
  SHORT = "short",
}

export interface ActiveGroup {
  token: ExtendedBankInfo;
  usdc: ExtendedBankInfo;
}

type ArenaBank = ExtendedBankInfo & {
  tokenData?: {
    price: number;
    priceChange24hr: number;
    volume24hr: number;
    volumeChange24hr: number;
    marketCap: number;
  };
};

type ArenaPool = {
  token: ArenaBank;
  quoteTokens: ArenaBank[]; // will just be single USDC bank for now, but this allows us to add quote tokens in future
  // just total liquidity for now, this could be other stats we get from goncarlo api
  poolData?: {
    totalLiquidity: number;
  };
};

interface GroupData {
  pool: ArenaPool;
  client: MarginfiClient;
  marginfiAccounts: MarginfiAccountWrapper[];
  selectedAccount: MarginfiAccountWrapper | null;
  accountSummary: AccountSummary;
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

  // user token account map
  tokenAccountMap: TokenAccountMap | null;

  // array of marginfi groups
  groupMap: Map<PublicKey, GroupData>;
  groups: PublicKey[];

  // array of extended token bank objects
  banks: ExtendedBankInfo[];

  // array of banks filtered by search query
  searchResults: ExtendedBankInfo[];

  // array of collateral usdc banks
  collateralBanks: {
    [token: string]: ExtendedBankInfo;
  };

  // array of all banks including collateral usdc banks
  banksIncludingUSDC: ExtendedBankInfo[];

  currentPage: number;

  totalPages: number;

  sortBy: TradePoolFilterStates;

  // marginfi client, initialized when viewing an active group
  marginfiClient: MarginfiClient | null;

  // active group, currently being viewed / traded
  activeGroup: ActiveGroup | null;

  // array of marginfi accounts
  marginfiAccounts: {
    [group: string]: MarginfiAccountWrapper;
  } | null;

  // currently selected marginfi account
  selectedAccount: MarginfiAccountWrapper | null;

  accountSummary: AccountSummary;

  // user native sol balance
  nativeSolBalance: number;

  // wallet state
  wallet: Wallet | null;
  connection: Connection | null;

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

  // set active banks and initialize marginfi client
  setActiveBank: ({
    bankPk,
    connection,
    wallet,
  }: {
    bankPk: PublicKey;
    connection?: Connection;
    wallet?: Wallet;
  }) => Promise<void>;

  setIsRefreshingStore: (isRefreshing: boolean) => void;
  refreshActiveBank: ({
    connection,
    wallet,
    allBanks,
    collateralBanks,
    tradeGroups,
  }: {
    connection?: Connection;
    wallet?: Wallet;
    allBanks: ExtendedBankInfo[];
    tradeGroups: TradeGroupsCache;
    collateralBanks: {
      [group: string]: ExtendedBankInfo;
    };
  }) => Promise<void>;
  resetActiveGroup: () => void;
  searchBanks: (searchQuery: string) => void;
  resetSearchResults: () => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (sortBy: TradePoolFilterStates) => void;
};

const { programId } = getConfig();

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

let fuse: Fuse<{ symbol: string; name: string; mintAddress: string }> | null = null;

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
  groups: [],
  groupMap: new Map<PublicKey, GroupData>(),
  banks: [],
  searchResults: [],
  banksIncludingUSDC: [],
  collateralBanks: {},
  currentPage: 1,
  totalPages: 0,
  sortBy: TradePoolFilterStates.TIMESTAMP,
  marginfiClient: null,
  activeGroup: null,
  marginfiAccounts: null,
  selectedAccount: null,
  accountSummary: DEFAULT_ACCOUNT_SUMMARY,
  nativeSolBalance: 0,
  tokenAccountMap: null,
  connection: null,
  wallet: null,

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
      let walletChanged = false;

      const connection = args.connection ?? get().connection;
      const argWallet = args.wallet;
      const storeWallet = get().wallet;
      const dummyWallet = {
        publicKey: PublicKey.default,
        signMessage: (arg: any) => {},
        signTransaction: (arg: any) => {},
        signAllTransactions: (arg: any) => {},
      } as Wallet;

      const wallet = argWallet ?? storeWallet ?? dummyWallet;
      if (!connection) throw new Error("Connection not found");
      if (!storeWallet && !argWallet) {
        walletChanged = false;
      } else if ((!storeWallet && argWallet) || (storeWallet && !argWallet)) {
        walletChanged = true;
      } else if (storeWallet && argWallet) {
        walletChanged = !storeWallet.publicKey.equals(argWallet.publicKey);
      }
      //   if (!wallet) throw new Error("Wallet not found");
      //   if (wallet?.publicKey) userDataFetched = true;

      let { tokenMetadataCache, bankMetadataCache, groupsCache } = get();

      if (!tokenMetadataCache || !bankMetadataCache || !groupsCache) {
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

      const marginfiAccounts: {
        [group: string]: MarginfiAccountWrapper;
      } = {};
      const mintDatas: Map<string, MintData> = new Map();

      const banksWithPriceAndToken: {
        bank: Bank;
        oraclePrice: OraclePrice;
        tokenMetadata: TokenMetadata;
      }[] = [];

      await Promise.all(
        groups.map(async (group) => {
          const bankKeys = groupsCache[group.toBase58()].map((bank) => new PublicKey(bank));
          const marginfiClient = await MarginfiClient.fetch(
            {
              environment: "production",
              cluster: "mainnet",
              programId,
              groupPk: group,
            },
            wallet,
            connection,
            {
              preloadedBankAddresses: bankKeys,
            }
          );

          let groupData: GroupData = {
            pool: {} as any,
            client: marginfiClient,
            marginfiAccounts: [],
            selectedAccount: null,
            accountSummary: DEFAULT_ACCOUNT_SUMMARY,
          };

          for (const [k, v] of marginfiClient.mintDatas) {
            mintDatas.set(k, v);
          }

          const banksIncludingUSDC = Array.from(marginfiClient.banks.values());

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
          const tokenBanks = extendedBankInfos.filter((bank) => bank.info.rawBank.address.equals(USDC_MINT));
          const collateralBanks = extendedBankInfos.filter((bank) => !bank.info.rawBank.address.equals(USDC_MINT));

          if (tokenBanks.length > 1) console.error("Inconsitency in token banks!");

          groupData.pool = {
            token: tokenBanks[0],
            quoteTokens: collateralBanks,
          };

          allBanks.push(...extendedBankInfos);

          if (!wallet.publicKey.equals(PublicKey.default)) {
            const mfiAccounts = await marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey);
            const mfiAccount = mfiAccounts[0];

            groupData.marginfiAccounts = mfiAccounts;
            groupData.selectedAccount = mfiAccount;
          }

          groupMap.set(group, groupData);
        })
      );

      let nativeSolBalance = 0;
      let tokenAccountMap: TokenAccountMap | null = null;
      if (!wallet.publicKey.equals(PublicKey.default)) {
        const [tokenData] = await Promise.all([
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

        nativeSolBalance = tokenData.nativeSolBalance;
        tokenAccountMap = tokenData.tokenAccountMap;

        for (const [id, group] of groupMap) {
          const updateBank = (bank: ExtendedBankInfo) => {
            const tokenAccount = tokenAccountMap?.get(bank.info.rawBank.mint.toBase58());
            if (!tokenAccount) return bank;

            return makeExtendedBankInfo(
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
          };

          const updatedPool = {
            token: updateBank(group.pool.token),
            quoteTokens: group.pool.quoteTokens.map(updateBank),
          };

          groupMap.set(id, { ...group, pool: updatedPool });
        }
      }

      //   const result = await fetchBanksAndTradeGroups(wallet, connection);

      // deprecate this
      const tokenBanks = [...groupMap.values()].map((group) => group.pool.token);

      if (!tokenBanks) throw new Error("Error fetching banks & groups");

      const totalPages = Math.ceil(groupMap.entries.length / POOLS_PER_PAGE);
      const currentPage = get().currentPage || 1;

      // sort banks according to sortBy
      const sortBy = get().sortBy;
      const sortedBanks = sortBanks(tokenBanks, sortBy, groupsCache);

      const banksPreppedForFuse = tokenBanks.map((bank, i) => ({
        symbol: bank.meta.tokenSymbol,
        name: bank.meta.tokenName,
        mintAddress: bank.info.rawBank.mint.toBase58(),
      }));

      fuse = new Fuse(banksPreppedForFuse, {
        includeScore: true,
        threshold: 0.2,
        keys: [
          {
            name: "symbol",
            weight: 0.7,
          },
          {
            name: "name",
            weight: 0.3,
          },
          {
            name: "mintAddress",
            weight: 0.1,
          },
        ],
      });

      set({
        initialized: true,
        groupsCache: result.tradeGroups,
        groups: result.groups,
        banks: sortedBanks,
        banksIncludingUSDC: result.allBanks,
        collateralBanks: result.collateralBanks,
        totalPages,
        currentPage,
        nativeSolBalance: result.nativeSolBalance,
        tokenAccountMap: result.tokenAccountMap,
        marginfiAccounts: result.marginfiAccounts,
        wallet: wallet,
        connection: connection,
        userDataFetched: userDataFetched,
      });

      if (get().activeGroup && args.refresh) {
        get().refreshActiveBank({
          connection,
          wallet,
          allBanks: result.allBanks,
          collateralBanks: result.collateralBanks,
          tradeGroups: result.tradeGroups,
        });
      }
    } catch (error) {
      console.error(error);
    }
  },

  refreshActiveBank: async (args) => {
    try {
      const connection = args.connection ?? get().connection;
      const wallet = args?.wallet ?? get().wallet;
      const activeGroup = get().activeGroup;

      if (!activeGroup) throw new Error("No group to refresh");
      if (!connection) throw new Error("Connection not found");
      if (!wallet) throw new Error("Wallet not found");

      const bankPk = new PublicKey(activeGroup.token.address);
      let bank = args.allBanks.find((bank) => new PublicKey(bank.address).equals(bankPk));

      if (!bank) return;

      const collateralBank = args.collateralBanks[bank.info.rawBank.address.toBase58()];

      const group = new PublicKey(bank.info.rawBank.group);
      const bankKeys = args.tradeGroups[group.toBase58()].map((bank) => new PublicKey(bank));
      const marginfiClient = await MarginfiClient.fetch(
        {
          environment: "production",
          cluster: "mainnet",
          programId,
          groupPk: group,
        },
        wallet,
        connection,
        {
          preloadedBankAddresses: bankKeys,
        }
      );

      let marginfiAccounts: MarginfiAccountWrapper[] = [];
      let selectedAccount: MarginfiAccountWrapper | null = null;
      let accountSummary: AccountSummary = DEFAULT_ACCOUNT_SUMMARY;
      let updatedTokenBank: ExtendedBankInfo = {
        ...bank,
        isActive: false,
      };
      let updatedCollateralBank: ExtendedBankInfo = {
        ...collateralBank,
        isActive: false,
      };

      if (wallet.publicKey) {
        marginfiAccounts = await marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey);
        selectedAccount = marginfiAccounts[0];

        // token bank
        const positionRaw = selectedAccount
          ? selectedAccount.activeBalances.find((balance) => balance.bankPk.equals(bank.address))
          : false;

        if (positionRaw) {
          const position = makeLendingPosition(
            positionRaw,
            bank.info.rawBank,
            makeBankInfo(bank.info.rawBank, bank.info.oraclePrice),
            bank.info.oraclePrice,
            selectedAccount
          );

          updatedTokenBank = {
            ...bank,
            position,
            isActive: true,
          };
        }

        const collateralPositionRaw = selectedAccount
          ? selectedAccount.activeBalances.find((balance) => balance.bankPk.equals(collateralBank.info.rawBank.address))
          : false;

        if (collateralPositionRaw) {
          const collateralPosition = makeLendingPosition(
            collateralPositionRaw,
            collateralBank.info.rawBank,
            makeBankInfo(collateralBank.info.rawBank, collateralBank.info.oraclePrice),
            collateralBank.info.oraclePrice,
            selectedAccount
          );

          updatedCollateralBank = {
            ...collateralBank,
            position: collateralPosition,
            isActive: true,
          };
        }

        if (selectedAccount) {
          accountSummary = computeAccountSummary(selectedAccount, [updatedTokenBank, updatedCollateralBank]);
        }
      }

      set({
        marginfiClient,
        selectedAccount,
        accountSummary,
        activeGroup: {
          token: updatedTokenBank,
          usdc: updatedCollateralBank,
        },
      });
    } catch (error) {
      console.error(error);
    }
  },

  setActiveBank: async (args) => {
    try {
      const connection = args.connection ?? get().connection;
      const wallet = args?.wallet ?? get().wallet;

      if (!connection) throw new Error("Connection not found");
      if (!wallet) throw new Error("Wallet not found");

      const bankPk = new PublicKey(args.bankPk);
      let bank = get().banksIncludingUSDC.find((bank) => new PublicKey(bank.address).equals(bankPk));

      if (!bank) return;

      const collateralBank = get().collateralBanks[bank.info.rawBank.address.toBase58()];

      const group = new PublicKey(bank.info.rawBank.group);
      const bankKeys = get().groupsCache[group.toBase58()].map((bank) => new PublicKey(bank));
      const marginfiClient = await MarginfiClient.fetch(
        {
          environment: "production",
          cluster: "mainnet",
          programId,
          groupPk: group,
        },
        wallet,
        connection,
        {
          preloadedBankAddresses: bankKeys,
        }
      );

      let marginfiAccounts: MarginfiAccountWrapper[] = [];
      let selectedAccount: MarginfiAccountWrapper | null = null;
      let accountSummary: AccountSummary = DEFAULT_ACCOUNT_SUMMARY;
      let updatedTokenBank: ExtendedBankInfo = {
        ...bank,
        isActive: false,
      };
      let updatedCollateralBank: ExtendedBankInfo = {
        ...collateralBank,
        isActive: false,
      };

      if (wallet.publicKey) {
        marginfiAccounts = await marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey);
        selectedAccount = marginfiAccounts[0];

        // token bank
        const positionRaw = selectedAccount
          ? selectedAccount.activeBalances.find((balance) => balance.bankPk.equals(bank.address))
          : false;

        if (positionRaw) {
          const position = makeLendingPosition(
            positionRaw,
            bank.info.rawBank,
            makeBankInfo(bank.info.rawBank, bank.info.oraclePrice),
            bank.info.oraclePrice,
            selectedAccount
          );

          updatedTokenBank = {
            ...bank,
            position,
            isActive: true,
          };
        }

        const collateralPositionRaw = selectedAccount
          ? selectedAccount.activeBalances.find((balance) => balance.bankPk.equals(collateralBank.info.rawBank.address))
          : false;

        if (collateralPositionRaw) {
          const collateralPosition = makeLendingPosition(
            collateralPositionRaw,
            collateralBank.info.rawBank,
            makeBankInfo(collateralBank.info.rawBank, collateralBank.info.oraclePrice),
            collateralBank.info.oraclePrice,
            selectedAccount
          );

          updatedCollateralBank = {
            ...collateralBank,
            position: collateralPosition,
            isActive: true,
          };
        }

        if (selectedAccount) {
          accountSummary = computeAccountSummary(selectedAccount, [updatedTokenBank, updatedCollateralBank]);
        }
      }

      set({
        marginfiClient,
        selectedAccount,
        accountSummary,
        activeGroup: {
          token: updatedTokenBank,
          usdc: updatedCollateralBank,
        },
      });
    } catch (error) {
      console.error(error);
    }
  },

  resetActiveGroup: () => {
    set((state) => {
      return {
        ...state,
        marginfiClient: null,
        selectedAccount: null,
        activeGroup: null,
      };
    });
  },

  searchBanks: (searchQuery: string) => {
    if (!fuse) return;
    const result = fuse.search(searchQuery);

    const banksFromResult = result
      .map((res) => get().banks.find((bank) => bank.info.rawBank.mint.toBase58() === res.item.mintAddress))
      .filter((bank): bank is ExtendedBankInfo => bank !== undefined);

    set((state) => {
      return {
        ...state,
        searchResults: banksFromResult,
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
    set((state) => {
      const sortedBanks = sortBanks(state.banks, sortBy, state.groupsCache);
      return {
        ...state,
        sortBy,
        banks: sortedBanks,
      };
    });
  },
});

export { createTradeStore };
export type { TradeStoreState };

const fetchBanksAndTradeGroups = async (wallet: Wallet | null, connection: Connection) => {
  if (!connection) throw new Error("Connection not found");
  //   if (!wallet) throw new Error("Wallet not found");
  const tradeGroups: TradeGroupsCache = await fetch(TRADE_GROUPS_MAP).then((res) => res.json());
  const tokenMetadataMap = await loadTokenMetadatas(TOKEN_METADATA_MAP);
  const bankMetadataMap = await loadBankMetadatas(BANK_METADATA_MAP);

  if (!tradeGroups) {
    console.error("Failed to fetch trade groups");
    return;
  }

  const groups = Object.keys(tradeGroups).map((group) => new PublicKey(group));
  const allBanks: ExtendedBankInfo[] = [];
  const banksWithPriceAndToken: {
    bank: Bank;
    oraclePrice: OraclePrice;
    tokenMetadata: TokenMetadata;
  }[] = [];
  const marginfiAccounts: {
    [group: string]: MarginfiAccountWrapper;
  } = {};
  const mintDatas: Map<string, MintData> = new Map();

  await Promise.all(
    groups.map(async (group) => {
      const bankKeys = tradeGroups[group.toBase58()].map((bank) => new PublicKey(bank));
      const marginfiClient = await MarginfiClient.fetch(
        {
          environment: "production",
          cluster: "mainnet",
          programId,
          groupPk: group,
        },
        wallet,
        connection,
        {
          preloadedBankAddresses: bankKeys,
        }
      );

      for (const [k, v] of marginfiClient.mintDatas) {
        mintDatas.set(k, v);
      }

      const banksIncludingUSDC = Array.from(marginfiClient.banks.values());

      banksIncludingUSDC.forEach((bank) => {
        const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
        if (!oraclePrice) {
          return;
        }

        const bankMetadata = bankMetadataMap[bank.address.toBase58()];
        if (bankMetadata === undefined) {
          return;
        }

        try {
          const tokenMetadata = getValueInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
          if (!tokenMetadata) {
            return;
          }

          banksWithPriceAndToken.push({ bank, oraclePrice, tokenMetadata });
        } catch (err) {
          console.error("error fetching token metadata: ", err);
        }
      });

      if (wallet.publicKey) {
        const mfiAccounts = await marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey);
        const mfiAccount = mfiAccounts[0];

        if (mfiAccount) {
          marginfiAccounts[group.toBase58()] = mfiAccount;
        }
      }
    })
  );

  let nativeSolBalance = 0;
  let tokenAccountMap: TokenAccountMap | null = null;
  if (wallet?.publicKey) {
    const [tokenData] = await Promise.all([
      fetchTokenAccounts(
        connection,
        wallet.publicKey,
        banksWithPriceAndToken.map((bank) => ({
          mint: bank.bank.mint,
          mintDecimals: bank.bank.mintDecimals,
          bankAddress: bank.bank.address,
        })),
        mintDatas
      ),
    ]);

    nativeSolBalance = tokenData.nativeSolBalance;
    tokenAccountMap = tokenData.tokenAccountMap;
  }

  const [extendedBankInfos] = await banksWithPriceAndToken.reduce(
    async (accPromise, { bank, oraclePrice, tokenMetadata }) => {
      const acc = await accPromise;
      let userData;
      if (wallet?.publicKey) {
        const marginfiAccount = marginfiAccounts[bank.group.toBase58()];
        const tokenAccount = tokenAccountMap!.get(bank.mint.toBase58());
        if (!tokenAccount) {
          return acc;
        }
        userData = {
          nativeSolBalance,
          tokenAccount,
          marginfiAccount,
        };
      }
      acc[0].push(makeExtendedBankInfo(tokenMetadata, bank, oraclePrice, undefined, userData));
      return acc;
    },
    Promise.resolve([[]] as [ExtendedBankInfo[]])
  );

  allBanks.push(...extendedBankInfos);

  const collateralBanks: {
    [group: string]: ExtendedBankInfo;
  } = {};

  for (let i = 0; i < allBanks.length - 1; i++) {
    collateralBanks[allBanks[i + 1].info.rawBank.address.toBase58()] = allBanks[i];
  }

  const tokenBanks = allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT));

  return {
    allBanks,
    tokenBanks,
    collateralBanks,
    tradeGroups,
    groups,
    nativeSolBalance,
    tokenAccountMap,
    marginfiAccounts,
  };
};

const sortBanks = (
  banks: ExtendedBankInfo[],
  sortBy: TradePoolFilterStates,
  groupsCache?: TradeGroupsCache
): ExtendedBankInfo[] => {
  if (sortBy === TradePoolFilterStates.PRICE_DESC) {
    return banks.sort(
      (a, b) => b.info.oraclePrice.priceRealtime.price.toNumber() - a.info.oraclePrice.priceRealtime.price.toNumber()
    );
  } else if (sortBy === TradePoolFilterStates.PRICE_ASC) {
    return banks.sort(
      (a, b) => a.info.oraclePrice.priceRealtime.price.toNumber() - b.info.oraclePrice.priceRealtime.price.toNumber()
    );
  } else if (sortBy === TradePoolFilterStates.LONG) {
    return banks.sort((a, b) => {
      const aPrice = a.info.state.price;
      const bPrice = b.info.state.price;
      const aTotalDeposits = a.info.state.totalDeposits * aPrice;
      const bTotalDeposits = b.info.state.totalDeposits * bPrice;
      return bTotalDeposits - aTotalDeposits;
    });
  } else if (sortBy === TradePoolFilterStates.SHORT) {
    return banks.sort((a, b) => {
      const aPrice = a.info.state.price;
      const bPrice = b.info.state.price;
      const aTotalBorrows = a.info.state.totalBorrows * aPrice;
      const bTotalBorrows = b.info.state.totalBorrows * bPrice;
      return bTotalBorrows - aTotalBorrows;
    });
  } else if (sortBy === TradePoolFilterStates.TIMESTAMP) {
    if (!groupsCache) {
      return banks;
    }
    const order = Object.keys(groupsCache).reverse();

    return banks.sort((a, b) => {
      const aGroupIndex = order.indexOf(a.info.rawBank.group.toBase58());
      const bGroupIndex = order.indexOf(b.info.rawBank.group.toBase58());
      return aGroupIndex - bGroupIndex;
    });
  }
  return banks;
};

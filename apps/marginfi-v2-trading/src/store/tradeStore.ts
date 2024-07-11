import { create, StateCreator } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import Fuse from "fuse.js";
import {
  ExtendedBankInfo,
  ExtendedBankMetadata,
  makeExtendedBankInfo,
  makeExtendedBankMetadata,
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
  MarginRequirementType,
} from "@mrgnlabs/marginfi-client-v2";
import {
  Wallet,
  TokenMetadata,
  loadTokenMetadatas,
  loadBankMetadatas,
  getValueInsensitive,
} from "@mrgnlabs/mrgn-common";

import { TRADE_GROUPS_MAP, TOKEN_METADATA_MAP, BANK_METADATA_MAP, POOLS_PER_PAGE } from "~/config/trade";

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

type TradeStoreState = {
  // keep track of store state
  initialized: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;

  // cache groups json store
  groupsCache: TradeGroupsCache;

  // user token account map
  tokenAccountMap: TokenAccountMap | null;

  // array of marginfi groups
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
  activeGroup: {
    token: ExtendedBankInfo;
    usdc: ExtendedBankInfo;
  } | null;

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
  fetchTradeState: ({ connection, wallet }: { connection?: Connection; wallet?: Wallet }) => void;

  // set active banks and initialize marginfi client
  setActiveBank: ({
    bankPk,
    connection,
    wallet,
  }: {
    bankPk: PublicKey;
    connection?: Connection;
    wallet?: Wallet;
  }) => void;

  setIsRefreshingStore: (isRefreshing: boolean) => void;
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
  groups: [],
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
      const connection = args.connection ?? get().connection;
      const wallet = args?.wallet ?? get().wallet;
      if (!connection) throw new Error("Connection not found");
      if (!wallet) throw new Error("Wallet not found");
      if (wallet.publicKey) userDataFetched = true;

      const result = await fetchBanksAndTradeGroups(wallet, connection);

      if (!result) throw new Error("Error fetching banks & groups");

      const totalPages = Math.ceil(result.tokenBanks.length / POOLS_PER_PAGE);
      const currentPage = get().currentPage || 1;

      // sort banks according to sortBy
      const sortBy = get().sortBy;
      const sortedBanks = sortBanks(result.tokenBanks, sortBy);

      const banksPreppedForFuse = result.tokenBanks.map((bank, i) => ({
        symbol: bank.meta.tokenSymbol,
        name: bank.meta.tokenName,
        mintAddress: bank.info.rawBank.mint.toBase58(),
      }));

      fuse = new Fuse(banksPreppedForFuse, {
        includeScore: true,
        findAllMatches: true,
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
        filteredBanks: [],
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
      const sortedBanks = sortBanks(state.banks, sortBy);
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

const fetchBanksAndTradeGroups = async (wallet: Wallet, connection: Connection) => {
  if (!connection) throw new Error("Connection not found");
  if (!wallet) throw new Error("Wallet not found");
  const tradeGroups: TradeGroupsCache = await fetch(TRADE_GROUPS_MAP).then((res) => res.json());

  if (!tradeGroups) {
    console.error("Failed to fetch trade groups");
    return;
  }

  const tokenMetadataMap = await loadTokenMetadatas(TOKEN_METADATA_MAP);

  const bankMetadataMap = await loadBankMetadatas(BANK_METADATA_MAP);

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
        banksWithPriceAndToken.map((bank) => ({ mint: bank.bank.mint, mintDecimals: bank.bank.mintDecimals }))
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
  // const tokenBanks = [
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  //   ...allBanks.filter((bank) => !bank.info.rawBank.mint.equals(USDC_MINT)),
  // ];

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

const sortBanks = (banks: ExtendedBankInfo[], sortBy: TradePoolFilterStates): ExtendedBankInfo[] => {
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
    return banks.sort((a, b) => b.info.rawBank.lastUpdate - a.info.rawBank.lastUpdate);
  }
  return banks;
};

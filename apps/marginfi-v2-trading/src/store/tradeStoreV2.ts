import { create, StateCreator } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";

import { TokenAccountMap } from "@mrgnlabs/mrgn-state";
import {
  getConfig,
  OraclePrice,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
  MarginfiGroup,
  MarginfiAccount,
  MintDataMap,
} from "@mrgnlabs/marginfi-client-v2";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Wallet,
  WalletToken,
  chunkedGetRawMultipleAccountInfoOrdered,
  nativeToUi,
  unpackAccount,
} from "@mrgnlabs/mrgn-common";
import { ArenaGroupStatus } from "@mrgnlabs/mrgn-utils";

import { POOLS_PER_PAGE, TOKEN_ICON_BASE_URL } from "~/config/trade";
import {
  ArenaBank,
  ArenaPoolPnl,
  ArenaPoolPositions,
  ArenaPoolSummary,
  ArenaPoolV2,
  BankData,
  TokenVolumeData,
} from "~/types/trade-store.types";
import { OraclePriceV2ApiResponse } from "~/types/api.types";
import {
  compileBankAndTokenMetadata,
  compileExtendedArenaBank,
  fetchBankDataMap,
  fetchInitialArenaState,
  fetchUserPnl,
  fetchUserPositions,
  getPoolPositionStatus,
  InitialArenaState,
  resetArenaBank,
  updateArenaBankWithUserData,
} from "~/utils";

export enum TradePoolFilterStates {
  TIMESTAMP = "timestamp",
  PRICE_MOVEMENT_ASC = "price-movement-asc",
  PRICE_MOVEMENT_DESC = "price-movement-desc",
  MARKET_CAP_ASC = "market-cap-asc",
  MARKET_CAP_DESC = "market-cap-desc",
  LIQUIDITY_ASC = "liquidity-asc",
  LIQUIDITY_DESC = "liquidity-desc",
  DEPOSITS_ASC = "deposits-asc",
  DEPOSITS_DESC = "deposits-desc",
  BORROWS_ASC = "borrows-asc",
  BORROWS_DESC = "borrows-desc",
  APY_ASC = "apy-asc",
  APY_DESC = "apy-desc",
}

type TradeStoreV2State = {
  // keep track of store state
  initialized: boolean;
  poolsFetched: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;

  // new objects
  arenaPoolsSummary: Record<string, ArenaPoolSummary>;
  arenaPools: Record<string, ArenaPoolV2>;
  groupsByGroupPk: Record<string, MarginfiGroup>;
  banksByBankPk: Record<string, ArenaBank>;
  positionsByGroupPk: Record<string, ArenaPoolPositions>;
  tokenVolumeDataByMint: Record<string, TokenVolumeData>;
  marginfiAccountByGroupPk: Record<string, MarginfiAccount>;
  mintDataByMint: MintDataMap;
  pythFeedIdMap: Map<string, { feedId: PublicKey; shardId?: number }>;
  oraclePrices: Record<string, OraclePrice>;
  hydrationComplete: boolean;

  // user token account map
  tokenAccountMap: TokenAccountMap;

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

  // wallet tokens
  walletTokens: WalletToken[] | null;

  /* Actions */
  // fetch arena group summary
  fetchArenaGroups: (initialArenaState?: InitialArenaState) => Promise<void>;
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
  fetchUserData: ({ connection, wallet }: { connection?: Connection; wallet?: Wallet }) => Promise<void>;
  refreshGroup: ({
    groupPk,
    banks,
    connection,
    wallet,
  }: {
    groupPk: PublicKey;
    banks: PublicKey[];
    connection?: Connection;
    wallet?: Wallet;
  }) => Promise<void>;
  setIsRefreshingStore: (isRefreshing: boolean) => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (sortBy: TradePoolFilterStates) => void;
  resetUserData: () => void;
  setHydrationComplete: () => void;
  fetchWalletTokens: (wallet: Wallet, banks: ArenaBank[]) => Promise<void>;
  updateWalletTokens: (connection: Connection) => Promise<void>;
  updateWalletToken: (tokenAddress: string, ata: string, connection: Connection) => Promise<void>;
};

const { programId } = getConfig();

function createTradeStoreV2() {
  return create<TradeStoreV2State>(stateCreator);
}

const stateCreator: StateCreator<TradeStoreV2State, [], []> = (set, get) => ({
  initialized: false,
  poolsFetched: false,
  userDataFetched: false,
  isRefreshingStore: false,
  currentPage: 1,
  totalPages: 0,
  sortBy: TradePoolFilterStates.PRICE_MOVEMENT_DESC,
  activeGroup: null,
  nativeSolBalance: 0,
  tokenAccountMap: new Map(),
  connection: null,
  wallet: {
    publicKey: PublicKey.default,
    signMessage: (arg: any) => {},
    signTransaction: (arg: any) => {},
    signAllTransactions: (arg: any) => {},
  } as Wallet,
  portfolio: null,
  referralCode: null,
  hydrationComplete: false,

  arenaPoolsSummary: {},
  arenaPools: {},
  groupsByGroupPk: {},
  banksByBankPk: {},
  marginfiAccountByGroupPk: {},
  tokenVolumeDataByMint: {},
  mintDataByMint: new Map(),
  pythFeedIdMap: new Map(),
  oraclePrices: {},
  positionsByGroupPk: {},

  walletTokens: null,

  setIsRefreshingStore: (isRefreshing) => {
    set((state) => {
      return {
        ...state,
        isRefreshingStore: isRefreshing,
      };
    });
  },

  setHydrationComplete: () => set({ hydrationComplete: true }),

  fetchArenaGroups: async (initialArenaState?: InitialArenaState) => {
    let { initialized } = get();

    if (!initialized) {
      try {
        // Fetch all data in parallel using Promise.all
        const stateContainsPools = initialArenaState && initialArenaState?.poolData.length > 0;
        const arenaState = stateContainsPools ? initialArenaState : await fetchInitialArenaState();

        if (!arenaState) {
          throw new Error("Failed to fetch arena state");
        }
        const tokenVolumeDataByMint = arenaState.tokenVolumeData.reduce(
          (acc, detail, index) => {
            acc[detail.mint] = detail;
            return acc;
          },
          {} as Record<string, TokenVolumeData>
        );

        const groupSummaryByGroup: Record<string, ArenaPoolSummary> = arenaState.poolData.reduce(
          (acc, pool) => {
            const { address: quoteBankPk, mint: quoteMint, details: quoteBankData } = pool.quote_bank;
            const { address: tokenBankPk, mint: tokenMint, details: tokenBankDetails } = pool.base_bank;
            // const tokenDetailsQuote = tokenDetailsByMint[quoteMint.address];
            // const tokenDetailsToken = tokenDetailsByMint[tokenMint.address];

            acc[pool.group] = {
              groupPk: new PublicKey(pool.group),
              luts: pool.lookup_tables.map((lut) => new PublicKey(lut)),
              tokenSummary: {
                bankPk: new PublicKey(tokenBankPk),
                mint: new PublicKey(tokenMint.address),
                tokenName: tokenMint.name,
                tokenSymbol: tokenMint.symbol,
                bankData: {
                  totalDeposits: tokenBankDetails.total_deposits,
                  totalBorrows: tokenBankDetails.total_borrows,
                  totalDepositsUsd: tokenBankDetails.total_deposits_usd,
                  totalBorrowsUsd: tokenBankDetails.total_borrows_usd,
                  depositRate: tokenBankDetails.deposit_rate,
                  borrowRate: tokenBankDetails.borrow_rate,
                  availableLiquidity: 0,
                } as BankData,
                tokenVolumeData: tokenVolumeDataByMint[tokenMint.address],
                tokenLogoUri: `${TOKEN_ICON_BASE_URL}${tokenMint.address}.png`,
                tokenProgram: new PublicKey(tokenMint.token_program),
              },
              quoteSummary: {
                bankPk: new PublicKey(quoteBankPk),
                mint: new PublicKey(quoteMint.address),
                tokenName: quoteMint.name,
                tokenSymbol: quoteMint.symbol,
                bankData: {
                  totalDeposits: quoteBankData.total_deposits,
                  totalBorrows: quoteBankData.total_borrows,
                  totalDepositsUsd: quoteBankData.total_deposits_usd,
                  totalBorrowsUsd: quoteBankData.total_borrows_usd,
                  depositRate: quoteBankData.deposit_rate,
                  borrowRate: quoteBankData.borrow_rate,
                  availableLiquidity: 0,
                } as BankData,
                tokenVolumeData: tokenVolumeDataByMint[quoteMint.address],
                tokenLogoUri: `${TOKEN_ICON_BASE_URL}${quoteMint.address}.png`,
                tokenProgram: new PublicKey(quoteMint.token_program),
              },
              createdAt: pool.created_at,
              createdBy: pool.created_by,
              featured: pool.featured,
            };
            return acc;
          },
          {} as Record<string, ArenaPoolSummary>
        );

        const sortedGroups = sortSummaryPools(groupSummaryByGroup, tokenVolumeDataByMint, get().sortBy);

        const totalPages = Math.ceil(Object.keys(sortedGroups).length / POOLS_PER_PAGE);
        const currentPage = get().currentPage || 1;

        set({
          arenaPoolsSummary: sortedGroups,
          tokenVolumeDataByMint: tokenVolumeDataByMint,
          initialized: true,
          totalPages,
          currentPage,
        });
      } catch (error) {
        console.error("Failed to fetch cache data:", error);
        return;
      }
    }
  },

  fetchExtendedArenaGroups: async (args) => {
    // if arguments are not provided use the current store state
    const connection = args.connection || get().connection;
    const wallet = args.wallet || get().wallet;
    const { arenaPoolsSummary, tokenVolumeDataByMint } = get();

    // errors thrown if these conditions are not met should be investigated
    if (!connection) throw new Error("Connection not found in fetching extended arena groups");
    if (!Object.keys(arenaPoolsSummary).length) throw new Error("Arena pools summary not found");

    // create provider and program
    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: programId.toBase58() };
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const bankAddresses: PublicKey[] = [];
    const groupAddresses: PublicKey[] = [];

    // get all bank and group addresses
    for (const group of Object.values(arenaPoolsSummary)) {
      bankAddresses.push(group.tokenSummary.bankPk, group.quoteSummary.bankPk);
      groupAddresses.push(group.groupPk);
    }

    // fetch pyth feed map and oracle prices for banks
    const [feedIdMap, oraclePrices] = await Promise.all([fetchPythFeedMap(), fetchOraclePrices()]);

    // fetch bank data map and collect emission mints
    const banksByBankPk = await fetchBankDataMap(program, bankAddresses, feedIdMap, arenaPoolsSummary);
    const banks = Array.from(banksByBankPk.values());
    const emissionMintKeys = banks
      .map((b) => b.emissionsMint)
      .filter((pk) => !pk.equals(PublicKey.default)) as PublicKey[];

    // Batch-fetch the emission mints and group accounts
    const allAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
      ...groupAddresses.map((pk) => pk.toBase58()),
      ...emissionMintKeys.map((pk) => pk.toBase58()),
    ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank
    const groupAis = allAis.splice(0, groupAddresses.length);
    const emissionMintAis = allAis.splice(0);

    const marginfiGroups = groupAis.map((groupAi, index) => {
      const groupAddress = groupAddresses[index];
      if (!groupAddress) throw new Error(`Failed to fetch group data for ${groupAddresses[index]}`);
      return MarginfiGroup.fromBuffer(groupAddress, groupAi.data, program.idl);
    });

    const { tokenDatas, priceInfos, banksWithPriceAndToken } = compileBankAndTokenMetadata(
      oraclePrices,
      banks,
      arenaPoolsSummary,
      {
        ais: emissionMintAis,
        keys: emissionMintKeys,
      }
    );

    let extendedBankInfos = compileExtendedArenaBank(banksWithPriceAndToken, tokenVolumeDataByMint);

    let nativeSolBalance = 0;
    let tokenAccountMap: TokenAccountMap | null = null;
    let marginfiAccountByGroupPk: Record<string, MarginfiAccount> = {};
    let isWalletFetched = false;

    const isWalletConnected = wallet.publicKey && !wallet.publicKey.equals(PublicKey.default);

    if (isWalletConnected) {
      const updatedData = await updateArenaBankWithUserData(
        connection,
        wallet.publicKey,
        program,
        extendedBankInfos,
        tokenDatas,
        priceInfos,
        banksByBankPk
      );

      extendedBankInfos = updatedData.updatedArenaBanks;
      nativeSolBalance = updatedData.nativeSolBalance;
      tokenAccountMap = updatedData.tokenAccountMap;
      marginfiAccountByGroupPk = updatedData.updateMarginfiAccounts;
      isWalletFetched = true;
    }

    const arenaPools: Record<string, ArenaPoolV2> = {};

    Object.entries(arenaPoolsSummary).map(([groupPk, group]) => {
      const arenaPool: ArenaPoolV2 = {
        groupPk: group.groupPk,
        tokenBankPk: group.tokenSummary.bankPk,
        quoteBankPk: group.quoteSummary.bankPk,
        lookupTables: group.luts ?? [],
      };

      arenaPools[groupPk] = arenaPool;
    });

    const extendedBanksByBankPk = extendedBankInfos.reduce(
      (acc, bank) => {
        acc[bank.info.rawBank.address.toBase58()] = bank;
        return acc;
      },
      {} as Record<string, ArenaBank>
    );

    const groupsByGroupPk = marginfiGroups.reduce(
      (acc, group) => {
        acc[group.address.toBase58()] = group;
        return acc;
      },
      {} as Record<string, MarginfiGroup>
    );

    set({
      arenaPools,
      poolsFetched: true,
      banksByBankPk: extendedBanksByBankPk,
      groupsByGroupPk,
      marginfiAccountByGroupPk,
      tokenAccountMap: tokenAccountMap ?? new Map(),
      nativeSolBalance,
      mintDataByMint: tokenDatas,
      wallet,
      connection,
      pythFeedIdMap: feedIdMap,
      oraclePrices,
      userDataFetched: isWalletFetched,
    });

    if (isWalletConnected) {
      const userPnl = await fetchUserPnl(wallet.publicKey);
      const pnlDataByGroupPk = userPnl.reduce(
        (acc, position) => {
          acc[position.groupPk.toBase58()] = position;
          return acc;
        },
        {} as Record<string, ArenaPoolPnl>
      );

      const positionData = fillMissingPositions(
        arenaPools,
        extendedBanksByBankPk,
        marginfiAccountByGroupPk,
        pnlDataByGroupPk
      );

      set({
        positionsByGroupPk: positionData,
      });
    }
  },

  fetchUserData: async (args) => {
    const connection = args.connection || get().connection;
    const wallet = args.wallet || get().wallet;

    const { banksByBankPk, mintDataByMint, oraclePrices } = get();

    if (!connection) throw new Error("Connection not found in fetching positions");

    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: programId.toBase58() };
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const rawBanksByBankPk = new Map(
      Object.entries(banksByBankPk).map(([key, arenaBank]) => [key, arenaBank.info.rawBank])
    );

    if (!wallet.publicKey || wallet.publicKey.equals(PublicKey.default)) {
      console.error("No wallet connected or invalid wallet state");
      return;
    }

    const arenaBanks = Object.values(banksByBankPk);

    const priceInfos = new Map(
      arenaBanks.map((bank) => {
        const priceData = oraclePrices[bank.address.toBase58()];
        if (!priceData) throw new Error(`Failed to fetch price oracle account for bank ${bank.address.toBase58()}`);
        return [bank.address.toBase58(), priceData as OraclePrice];
      })
    );

    const { updatedArenaBanks, nativeSolBalance, tokenAccountMap, updateMarginfiAccounts } =
      await updateArenaBankWithUserData(
        connection,
        wallet.publicKey,
        program,
        arenaBanks,
        mintDataByMint,
        priceInfos,
        rawBanksByBankPk
      );

    const extendedBanksByBankPk = updatedArenaBanks.reduce(
      (acc, bank) => {
        acc[bank.info.rawBank.address.toBase58()] = bank;
        return acc;
      },
      {} as Record<string, ArenaBank>
    );

    set({
      banksByBankPk: extendedBanksByBankPk,
      nativeSolBalance,
      tokenAccountMap,
      marginfiAccountByGroupPk: updateMarginfiAccounts,
      wallet,
      connection,
      userDataFetched: true,
    });
  },

  refreshGroup: async (args) => {
    const prevUserPositions = get().positionsByGroupPk[args.groupPk.toBase58()];
    const connection = args.connection || get().connection;
    const wallet = args.wallet || get().wallet;
    const bankAddresses = args.banks;
    const { pythFeedIdMap, arenaPoolsSummary, oraclePrices, tokenVolumeDataByMint } = get();

    if (!connection) throw new Error("Connection not found");

    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: programId.toBase58() };
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const banksByBankPk = await fetchBankDataMap(program, bankAddresses, pythFeedIdMap, arenaPoolsSummary);
    const banks = Array.from(banksByBankPk.values());

    const emissionMintKeys = banks
      .map((b) => b.emissionsMint)
      .filter((pk) => !pk.equals(PublicKey.default)) as PublicKey[];

    const emissionMintAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
      ...emissionMintKeys.map((pk) => pk.toBase58()),
    ]);

    const { tokenDatas, priceInfos, banksWithPriceAndToken } = compileBankAndTokenMetadata(
      oraclePrices,
      banks,
      arenaPoolsSummary,
      {
        ais: emissionMintAis,
        keys: emissionMintKeys,
      }
    );

    let extendedBankInfos = compileExtendedArenaBank(banksWithPriceAndToken, tokenVolumeDataByMint);

    let nativeSolBalance = 0;
    let tokenAccountMap: TokenAccountMap | null = null;
    let marginfiAccount: MarginfiAccount | null = null;
    const isWalletConnected = wallet.publicKey && !wallet.publicKey.equals(PublicKey.default);

    const {
      banksByBankPk: storeBanksByBankPk,
      marginfiAccountByGroupPk: storeMarginfiAccountByGroupPk,
      tokenAccountMap: storeTokenAccountMap,
    } = get();

    const newStoreBanksByBankPk = { ...storeBanksByBankPk };

    if (isWalletConnected) {
      const updatedData = await updateArenaBankWithUserData(
        connection,
        wallet.publicKey,
        program,
        extendedBankInfos,
        tokenDatas,
        priceInfos,
        banksByBankPk,
        args.groupPk
      );

      extendedBankInfos = updatedData.updatedArenaBanks;
      nativeSolBalance = updatedData.nativeSolBalance;
      tokenAccountMap = updatedData.tokenAccountMap;
      marginfiAccount = updatedData.updateMarginfiAccounts[args.groupPk.toBase58()] ?? null;

      if (marginfiAccount) {
        storeMarginfiAccountByGroupPk[args.groupPk.toBase58()] = marginfiAccount;
      } else {
        delete storeMarginfiAccountByGroupPk[args.groupPk.toBase58()];
      }
    }

    // update store
    const newTokenAccountMap = new Map(storeTokenAccountMap);

    extendedBankInfos.map((bank) => {
      newStoreBanksByBankPk[bank.address.toBase58()] = bank;
    });

    tokenAccountMap?.forEach((value, key) => {
      newTokenAccountMap.set(key, value);
    });

    set({
      nativeSolBalance,
      marginfiAccountByGroupPk: storeMarginfiAccountByGroupPk,
      banksByBankPk: newStoreBanksByBankPk,
      tokenAccountMap: newTokenAccountMap,
    });

    if (isWalletConnected) {
      const userPositions = await fetchUserPnl(wallet.publicKey);
      const pnlDataByGroupPk = userPositions.reduce(
        (acc, position) => {
          acc[position.groupPk.toBase58()] = position;
          return acc;
        },
        {} as Record<string, ArenaPoolPnl>
      );
      const positionsByGroupPk = fillMissingPositions(
        get().arenaPools,
        newStoreBanksByBankPk,
        storeMarginfiAccountByGroupPk,
        pnlDataByGroupPk
      );

      set({
        positionsByGroupPk,
      });
    }
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
    const { arenaPoolsSummary, tokenVolumeDataByMint, arenaPools, banksByBankPk } = get();

    const sortedPoolsSummary = sortSummaryPools(arenaPoolsSummary, tokenVolumeDataByMint, sortBy);
    const sortedPools = sortPools(arenaPools, tokenVolumeDataByMint, banksByBankPk, sortBy);

    set({ sortBy, arenaPoolsSummary: sortedPoolsSummary, arenaPools: sortedPools });
  },

  resetUserData: () => {
    // reset arenaBanks
    const { banksByBankPk } = get();

    const updatedArenaBanks = Object.values(banksByBankPk).map((bank) => {
      return resetArenaBank(bank);
    });

    // Convert array back to Record<string, ArenaBank>
    const updatedBanksByBankPk = updatedArenaBanks.reduce(
      (acc, bank) => {
        acc[bank.address.toBase58()] = bank;
        return acc;
      },
      {} as Record<string, ArenaBank>
    );

    set({
      banksByBankPk: updatedBanksByBankPk,
      nativeSolBalance: 0,
      tokenAccountMap: new Map(),
      marginfiAccountByGroupPk: {},
      wallet: undefined,
      userDataFetched: false,
    });
  },

  fetchWalletTokens: async (wallet: Wallet, extendedBankInfos: ArenaBank[]) => {
    try {
      const response = await fetch(`/api/user/wallet?wallet=${wallet.publicKey.toBase58()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch wallet tokens");
      }
      const data = await response.json();

      const mappedData: WalletToken[] = data.map((token: WalletToken) => {
        return {
          ...token,
          address: new PublicKey(token.address),
          ata: new PublicKey(token.ata),
        };
      });

      const bankTokenSymbols = new Set(extendedBankInfos.map((bank) => bank.meta.tokenSymbol));
      const bankTokenAddresses = new Set(extendedBankInfos.map((bank) => bank.address.toBase58()));

      const filteredTokens = mappedData
        .filter((token) => !bankTokenSymbols.has(token.symbol))
        .filter((token) => !bankTokenAddresses.has(token.address.toBase58()));

      set({ walletTokens: filteredTokens });
    } catch (error) {
      console.error("Failed to fetch wallet tokens:", error);
    }
  },
  updateWalletTokens: async (connection: Connection) => {
    try {
      const walletTokens = get().walletTokens;

      if (!walletTokens) {
        return;
      }

      // Updated prices
      const response = await fetch(
        `/api/tokens/price-multiple?tokenAddress=${encodeURIComponent(
          walletTokens.map((token) => token.address.toBase58()).join(",")
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch wallet tokens");
      }

      const updatedPrices = await response.json();

      // Updated balances
      const accountsAiList = await connection.getMultipleAccountsInfo([...walletTokens.map((token) => token.ata)]);

      const decodedAccountInfos = accountsAiList.map((ai, idx) => {
        let accountOwner;
        if (ai?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
          accountOwner = TOKEN_2022_PROGRAM_ID;
        } else {
          accountOwner = TOKEN_PROGRAM_ID;
        }
        const decoded = unpackAccount(walletTokens[idx].ata, ai, accountOwner);
        return decoded;
      });

      const updatedWalletTokens = walletTokens.map((token) => {
        const tokenPriceData = updatedPrices[token.address.toBase58()];
        const tokenBalance = decodedAccountInfos.find(
          (decoded) => decoded.mint.toBase58() === token.address.toBase58()
        );
        return {
          ...token,
          price: tokenPriceData ? tokenPriceData.value : token.price,
          balance: tokenBalance
            ? Number(nativeToUi(tokenBalance.amount.toString(), token.mintDecimals))
            : token.balance,
        };
      });

      // Update the state with the new token prices
      set({ walletTokens: updatedWalletTokens });
    } catch (error) {
      console.error("Failed to update wallet tokens:", error);
    }
  },

  updateWalletToken: async (tokenAddress: string, ata: string, connection: Connection) => {
    try {
      const walletTokens = get().walletTokens;

      if (!walletTokens) {
        return;
      }

      // Updated price
      const response = await fetch(`/api/tokens/price?tokenAddress=${tokenAddress}`);

      if (!response.ok) {
        throw new Error("Failed to fetch wallet token");
      }

      const updatedPriceObject = await response.json();

      // Updated balance
      const accountInfo = await connection.getAccountInfo(new PublicKey(ata));
      let accountOwner;
      if (accountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        accountOwner = TOKEN_2022_PROGRAM_ID;
      } else {
        accountOwner = TOKEN_PROGRAM_ID;
      }
      const decoded = unpackAccount(new PublicKey(ata), accountInfo, accountOwner);

      // Updated wallet tokens
      const updatedWalletTokens = walletTokens.map((token) => {
        if (token.address.toBase58() === tokenAddress) {
          return {
            ...token,
            price: updatedPriceObject.value,
            balance: nativeToUi(decoded.amount.toString(), token.mintDecimals),
          };
        }
        return token;
      });

      set({ walletTokens: updatedWalletTokens });
    } catch (error) {
      console.error("Failed to update wallet token:", error);
    }
  },
});

const sortPools = (
  arenaPools: Record<string, ArenaPoolV2>,
  tokenVolumeDataByMint: Record<string, TokenVolumeData>,
  banksByBankPk: Record<string, ArenaBank>,
  sortBy: TradePoolFilterStates
) => {
  const groups = [...Object.values(arenaPools)];
  const timestampOrder = Object.keys(arenaPools).reverse();

  const sortedGroups = groups.sort((a, b) => {
    const aTokenData = tokenVolumeDataByMint[a.tokenBankPk.toBase58()];
    const bTokenData = tokenVolumeDataByMint[b.tokenBankPk.toBase58()];

    const aBankData = banksByBankPk[a.tokenBankPk.toBase58()];
    const aQuoteBankData = banksByBankPk[a.quoteBankPk.toBase58()];
    const bBankData = banksByBankPk[b.tokenBankPk.toBase58()];
    const bQuoteBankData = banksByBankPk[b.quoteBankPk.toBase58()];

    const depositsUsdValue = (bank: ArenaBank) => {
      return bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber();
    };

    const borrowsUsdValue = (bank: ArenaBank) => {
      return bank.info.state.totalBorrows * bank.info.oraclePrice.priceRealtime.price.toNumber();
    };

    if (sortBy === TradePoolFilterStates.TIMESTAMP) {
      const aIndex = timestampOrder.indexOf(a.groupPk.toBase58());
      const bIndex = timestampOrder.indexOf(b.groupPk.toBase58());
      return aIndex - bIndex;
    } else if (sortBy.startsWith("price-movement")) {
      const aPrice = Math.abs(aTokenData?.priceChange24h ?? 0);
      const bPrice = Math.abs(bTokenData?.priceChange24h ?? 0);
      return sortBy === TradePoolFilterStates.PRICE_MOVEMENT_ASC ? aPrice - bPrice : bPrice - aPrice;
    } else if (sortBy.startsWith("market-cap")) {
      const aMarketCap = aTokenData?.marketcap ?? 0;
      const bMarketCap = bTokenData?.marketcap ?? 0;
      return sortBy === TradePoolFilterStates.MARKET_CAP_ASC ? aMarketCap - bMarketCap : bMarketCap - aMarketCap;
    } else if (sortBy.startsWith("deposits")) {
      const aLiquidity = depositsUsdValue(aBankData) + depositsUsdValue(aQuoteBankData);
      const bLiquidity = depositsUsdValue(bBankData) + depositsUsdValue(bQuoteBankData);
      return sortBy === TradePoolFilterStates.DEPOSITS_ASC ? aLiquidity - bLiquidity : bLiquidity - aLiquidity;
    } else if (sortBy.startsWith("borrows")) {
      const aLiquidity = borrowsUsdValue(aBankData) + borrowsUsdValue(aQuoteBankData);
      const bLiquidity = borrowsUsdValue(bBankData) + borrowsUsdValue(bQuoteBankData);
      return sortBy === TradePoolFilterStates.BORROWS_ASC ? aLiquidity - bLiquidity : bLiquidity - aLiquidity;
    } else if (sortBy.startsWith("liquidity")) {
      const aLiquidity = depositsUsdValue(aBankData) - borrowsUsdValue(aBankData);
      const bLiquidity = depositsUsdValue(bBankData) - borrowsUsdValue(bBankData);
      return sortBy === TradePoolFilterStates.LIQUIDITY_ASC ? aLiquidity - bLiquidity : bLiquidity - aLiquidity;
    } else if (sortBy.startsWith("apy")) {
      // todo add apy filter
      const getHighestLendingRate = (tokenBank: ArenaBank, quoteBank: ArenaBank) => {
        const rates = [tokenBank.info.state.lendingRate, quoteBank.info.state.lendingRate];
        return Math.max(...rates);
      };

      const aQuoteBank = banksByBankPk[a.quoteBankPk.toBase58()];
      const bQuoteBank = banksByBankPk[b.quoteBankPk.toBase58()];

      const aHighestRate = getHighestLendingRate(aBankData, aQuoteBank);
      const bHighestRate = getHighestLendingRate(bBankData, bQuoteBank);
      return sortBy === TradePoolFilterStates.APY_ASC ? aHighestRate - bHighestRate : bHighestRate - aHighestRate;
    }

    return 0;
  });

  const sortedPools: Record<string, ArenaPoolV2> = {};

  sortedGroups.forEach((group) => {
    sortedPools[group.groupPk.toBase58()] = group;
  });

  return sortedPools;
};

const sortSummaryPools = (
  arenaPools: Record<string, ArenaPoolSummary>,
  tokenVolumeDataByMint: Record<string, TokenVolumeData>,
  sortBy: TradePoolFilterStates
) => {
  const groups = [...Object.values(arenaPools)];
  const timestampOrder = Object.keys(arenaPools).reverse();

  const sortedGroups = groups.sort((a, b) => {
    const aTokenData = tokenVolumeDataByMint[a.tokenSummary.mint.toBase58()];
    const bTokenData = tokenVolumeDataByMint[b.tokenSummary.mint.toBase58()];

    if (sortBy === TradePoolFilterStates.TIMESTAMP) {
      const aCreatedAt = new Date(a.createdAt).getTime();
      const bCreatedAt = new Date(b.createdAt).getTime();
      return bCreatedAt - aCreatedAt;
    } else if (sortBy.startsWith("price-movement")) {
      const aPrice = Math.abs(aTokenData?.priceChange24h ?? 0);
      const bPrice = Math.abs(bTokenData?.priceChange24h ?? 0);
      return sortBy === TradePoolFilterStates.PRICE_MOVEMENT_ASC ? aPrice - bPrice : bPrice - aPrice;
    } else if (sortBy.startsWith("market-cap")) {
      const aMarketCap = aTokenData?.marketcap ?? 0;
      const bMarketCap = bTokenData?.marketcap ?? 0;
      return sortBy === TradePoolFilterStates.MARKET_CAP_ASC ? aMarketCap - bMarketCap : bMarketCap - aMarketCap;
    } else if (sortBy.startsWith("liquidity")) {
      const aLiquidity =
        (a.tokenSummary?.bankData?.totalDepositsUsd ?? 0) + (a.quoteSummary?.bankData?.totalDepositsUsd ?? 0);
      const bLiquidity =
        (b.tokenSummary?.bankData?.totalDepositsUsd ?? 0) + (b.quoteSummary?.bankData?.totalDepositsUsd ?? 0);
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
  const feedIdMapRaw: Record<string, { feedId: string; shardId?: number }> = await fetch(`/api/oracle/pythFeedMapV2`)
    .then((response) => response.json())
    .catch((error) => {
      throw new Error("Error fetching pyth feed map", error);
    });

  if (feedIdMapRaw.error) {
    throw new Error("Error fetching pyth feed map");
  }

  const feedIdMap: Map<string, { feedId: PublicKey; shardId?: number }> = new Map(
    Object.entries(feedIdMapRaw).map(([key, value]) => [
      key,
      { feedId: new PublicKey(value.feedId), shardId: value.shardId },
    ])
  );
  return feedIdMap;
}

async function fetchOraclePrices() {
  const response = await fetch(`/api/oracle/priceV2`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).catch((error) => {
    throw new Error("Error fetching oracle prices", error);
  });

  if (!response.ok) {
    throw new Error("Failed to fetch oracle prices");
  }

  const responseBody: OraclePriceV2ApiResponse = await response.json();

  if (!responseBody) {
    throw new Error("Failed to fetch oracle prices");
  }

  const oraclePrices: Record<string, OraclePrice> = Object.fromEntries(
    Object.entries(responseBody).map(([key, oraclePrice]: [string, any]) => [
      key,
      {
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
        timestamp: oraclePrice.timestamp ? BigNumber(oraclePrice.timestamp) : BigNumber(0),
      },
    ])
  );

  return oraclePrices;
}

function fillMissingPositions(
  arenaPools: Record<string, ArenaPoolV2>,
  banksByBankPk: Record<string, ArenaBank>,
  accountByGroupPk: Record<string, MarginfiAccount>,
  pnlData: Record<string, ArenaPoolPnl>
): Record<string, ArenaPoolPositions> {
  const positionData: Record<string, ArenaPoolPositions> = {};

  Object.values(arenaPools).map((pool) => {
    const tokenBank = banksByBankPk[pool.tokenBankPk.toBase58()];
    const quoteBank = banksByBankPk[pool.quoteBankPk.toBase58()];
    const account = accountByGroupPk[pool.groupPk.toBase58()];

    const status = getPoolPositionStatus(pool, tokenBank, quoteBank);

    if (status === ArenaGroupStatus.EMPTY || !tokenBank || !quoteBank) {
      delete pnlData[pool.groupPk.toBase58()];
    }

    if (status === ArenaGroupStatus.LONG || status === ArenaGroupStatus.SHORT) {
      const pnlPositionData = pnlData[pool.groupPk.toBase58()];

      const positionQuoteData = quoteBank.isActive && quoteBank.position;
      const positionTokenData = tokenBank.isActive && tokenBank.position;

      let depositValue = 0,
        borrowValue = 0,
        depositSize = 0,
        borrowSize = 0;

      if (status === ArenaGroupStatus.SHORT) {
        depositValue = positionQuoteData ? positionQuoteData.usdValue : 0;
        borrowValue = positionTokenData ? positionTokenData.usdValue : 0;
        depositSize = positionQuoteData ? positionQuoteData.amount : 0;
      } else if (status === ArenaGroupStatus.LONG) {
        depositValue = positionTokenData ? positionTokenData.usdValue : 0;
        borrowValue = positionQuoteData ? positionQuoteData.usdValue : 0;
        depositSize = positionTokenData ? positionTokenData.amount : 0;
      }

      const sizeUsd = depositValue - borrowValue;

      if (pnlPositionData) {
        let properEntryPrice: number = 0;
        if (Array.isArray(pnlPositionData.entryPrices) && pnlPositionData.entryPrices.length > 1) {
          properEntryPrice = pnlPositionData.entryPrices[0] / pnlPositionData.entryPrices[1];
        }

        positionData[pool.groupPk.toBase58()] = {
          groupPk: pool.groupPk,
          accountPk: account?.address ?? PublicKey.default,
          authorityPk: account?.authority ?? PublicKey.default,
          direction: status === ArenaGroupStatus.LONG ? "long" : "short",
          entryPrice: properEntryPrice,
          currentPositionValue: sizeUsd,
          pnl: pnlPositionData.totalPnlUsd,
        };
      } else {
        positionData[pool.groupPk.toBase58()] = {
          groupPk: pool.groupPk,
          accountPk: account?.address ?? PublicKey.default,
          authorityPk: account?.authority ?? PublicKey.default,
          direction: status === ArenaGroupStatus.LONG ? "long" : "short",
          entryPrice: tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
          currentPositionValue: sizeUsd,
          pnl: 0,
        };
      }
    }
  });

  return positionData;
}

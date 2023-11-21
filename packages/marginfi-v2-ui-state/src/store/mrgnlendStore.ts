import { MarginfiAccountWrapper, MarginfiClient, MarginfiConfig } from "@mrgnlabs/marginfi-client-v2";
import {
  Wallet,
  getValueInsensitive,
  loadBankMetadatas,
  loadTokenMetadatas,
  BankMetadataMap,
  TokenMetadataMap,
  TokenMetadata,
} from "@mrgnlabs/mrgn-common";
import { Bank, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  DEFAULT_ACCOUNT_SUMMARY,
  fetchEmissionsPriceMap,
  computeAccountSummary,
  fetchTokenAccounts,
  makeExtendedBankInfo,
  AccountSummary,
  ExtendedBankInfo,
  TokenAccountMap,
  ExtendedBankMetadata,
  makeExtendedBankMetadata,
} from "../lib";
import { getPointsSummary } from "../lib/points";
import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

interface ProtocolStats {
  deposits: number;
  borrows: number;
  tvl: number;
  pointsTotal: number;
}

interface MrgnlendState {
  // State
  initialized: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;
  marginfiClient: MarginfiClient | null;
  bankMetadataMap: BankMetadataMap;
  tokenMetadataMap: TokenMetadataMap;
  extendedBankMetadatas: ExtendedBankMetadata[];
  extendedBankInfos: ExtendedBankInfo[];
  protocolStats: ProtocolStats;
  marginfiAccountCount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  nativeSolBalance: number;
  accountSummary: AccountSummary;
  birdEyeApiKey: string;

  // Actions
  fetchMrgnlendState: (args?: {
    marginfiConfig?: MarginfiConfig;
    connection?: Connection;
    wallet?: Wallet;
    isOverride?: boolean;
    birdEyeApiKey?: string;
  }) => Promise<void>;
  setIsRefreshingStore: (isRefreshingStore: boolean) => void;
  resetUserData: () => void;
}

function createMrgnlendStore() {
  return create<MrgnlendState>(stateCreator);
}

function createPersistentMrgnlendStore() {
  return create<MrgnlendState, [["zustand/persist", Pick<MrgnlendState, "extendedBankInfos" | "protocolStats">]]>(
    persist(stateCreator, {
      name: "mrgnlend-peristent-store",
      partialize(state) {
        return {
          extendedBankInfos: state.extendedBankInfos,
          protocolStats: state.protocolStats,
        };
      },
    })
  );
}

const stateCreator: StateCreator<MrgnlendState, [], []> = (set, get) => ({
  // State
  initialized: false,
  userDataFetched: false,
  isRefreshingStore: false,
  marginfiClient: null,
  bankMetadataMap: {},
  tokenMetadataMap: {},
  extendedBankMetadatas: [],
  extendedBankInfos: [],
  protocolStats: {
    deposits: 0,
    borrows: 0,
    tvl: 0,
    pointsTotal: 0,
  },
  marginfiAccountCount: 0,
  selectedAccount: null,
  nativeSolBalance: 0,
  accountSummary: DEFAULT_ACCOUNT_SUMMARY,
  birdEyeApiKey: "",

  // Actions
  fetchMrgnlendState: async (args?: {
    marginfiConfig?: MarginfiConfig;
    connection?: Connection;
    wallet?: Wallet;
    isOverride?: boolean;
    birdEyeApiKey?: string;
  }) => {
    try {
      let userDataFetched = false;

      const connection = args?.connection ?? get().marginfiClient?.provider.connection;
      if (!connection) throw new Error("Connection not found");

      const wallet = args?.wallet ?? get().marginfiClient?.provider?.wallet;

      const marginfiConfig = args?.marginfiConfig ?? get().marginfiClient?.config;
      if (!marginfiConfig) throw new Error("Marginfi config must be provided at least once");

      const isReadOnly = args?.isOverride !== undefined ? args.isOverride : get().marginfiClient?.isReadOnly ?? false;
      const [marginfiClient, bankMetadataMap, tokenMetadataMap] = await Promise.all([
        MarginfiClient.fetch(marginfiConfig, wallet ?? ({} as any), connection, undefined, isReadOnly),
        loadBankMetadatas(),
        loadTokenMetadatas(),
      ]);
      const banks = [...marginfiClient.banks.values()];

      const birdEyeApiKey = args?.birdEyeApiKey ?? get().birdEyeApiKey;
      const priceMap = await fetchEmissionsPriceMap(banks, connection, birdEyeApiKey);

      let nativeSolBalance: number = 0;
      let tokenAccountMap: TokenAccountMap;
      let marginfiAccounts: MarginfiAccountWrapper[] = [];
      let selectedAccount: MarginfiAccountWrapper | null = null;
      if (wallet?.publicKey) {
        const [tokenData, marginfiAccountWrappers] = await Promise.all([
          fetchTokenAccounts(
            connection,
            wallet.publicKey,
            banks.map((bank) => ({ mint: bank.mint, mintDecimals: bank.mintDecimals }))
          ),
          marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey),
        ]);

        nativeSolBalance = tokenData.nativeSolBalance;
        tokenAccountMap = tokenData.tokenAccountMap;
        marginfiAccounts = marginfiAccountWrappers;
        selectedAccount = marginfiAccounts[0];
        userDataFetched = true;
      }

      const banksWithPriceAndToken: {
        bank: Bank;
        oraclePrice: OraclePrice;
        tokenMetadata: TokenMetadata;
      }[] = [];

      banks.forEach((bank) => {
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

      const [extendedBankInfos, extendedBankMetadatas] = banksWithPriceAndToken.reduce(
        (acc, { bank, oraclePrice, tokenMetadata }) => {
          const emissionTokenPriceData = priceMap[bank.emissionsMint.toBase58()];

          let userData;
          if (wallet?.publicKey) {
            const tokenAccount = tokenAccountMap!.get(bank.mint.toBase58());
            if (!tokenAccount) {
              return acc;
            }
            userData = {
              nativeSolBalance,
              tokenAccount,
              marginfiAccount: selectedAccount,
            };
          }

          acc[0].push(makeExtendedBankInfo(tokenMetadata, bank, oraclePrice, emissionTokenPriceData, userData));
          acc[1].push(makeExtendedBankMetadata(new PublicKey(bank.address), tokenMetadata));

          return acc;
        },
        [[], []] as [ExtendedBankInfo[], ExtendedBankMetadata[]]
      );

      const sortedExtendedBankInfos = extendedBankInfos.sort(
        (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
      );

      const sortedExtendedBankMetadatas = extendedBankMetadatas.sort((am, bm) => {
        const a = sortedExtendedBankInfos.find((a) => a.address.equals(am.address))!;
        const b = sortedExtendedBankInfos.find((b) => b.address.equals(bm.address))!;
        return b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price;
      });

      const { deposits, borrows } = extendedBankInfos.reduce(
        (acc, bank) => {
          acc.deposits += bank.info.state.totalDeposits * bank.info.oraclePrice.price.toNumber();
          acc.borrows += bank.info.state.totalBorrows * bank.info.oraclePrice.price.toNumber();
          return acc;
        },
        { deposits: 0, borrows: 0 }
      );

      let accountSummary: AccountSummary = DEFAULT_ACCOUNT_SUMMARY;
      if (wallet?.publicKey && selectedAccount) {
        accountSummary = computeAccountSummary(selectedAccount, extendedBankInfos);
      }

      const pointSummary = await getPointsSummary();

      set({
        initialized: true,
        userDataFetched,
        isRefreshingStore: false,
        marginfiClient,
        bankMetadataMap,
        tokenMetadataMap,
        extendedBankInfos: sortedExtendedBankInfos,
        extendedBankMetadatas: sortedExtendedBankMetadatas,
        protocolStats: {
          deposits,
          borrows,
          tvl: deposits - borrows,
          pointsTotal: pointSummary.points_total,
        },
        marginfiAccountCount: marginfiAccounts.length,
        selectedAccount,
        nativeSolBalance,
        accountSummary,
        birdEyeApiKey,
      });
    } catch (err) {
      console.error("error refreshing state: ", err);
      set({ isRefreshingStore: false });
    }
  },
  setIsRefreshingStore: (isRefreshingStore: boolean) => set({ isRefreshingStore }),
  resetUserData: () => {
    const extendedBankInfos = get().extendedBankInfos.map((extendedBankInfo) => ({
      ...extendedBankInfo,
      userInfo: {
        tokenAccount: {
          created: false,
          mint: extendedBankInfo.info.state.mint,
          balance: 0,
        },
        maxDeposit: 0,
        maxRepay: 0,
        maxWithdraw: 0,
        maxBorrow: 0,
      },
    }));

    set({
      userDataFetched: false,
      selectedAccount: null,
      nativeSolBalance: 0,
      accountSummary: DEFAULT_ACCOUNT_SUMMARY,
      extendedBankInfos,
      marginfiClient: null,
    });
  },
});

export { createMrgnlendStore, createPersistentMrgnlendStore };
export type { MrgnlendState };

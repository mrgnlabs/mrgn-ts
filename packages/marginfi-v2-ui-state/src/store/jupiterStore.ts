import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { Wallet, nativeToUi, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { TokenInfo, TokenListContainer } from "@solana/spl-token-registry";
import { Connection, PublicKey } from "@solana/web3.js";
import { TokenAccountMap, TokenAccount } from "../lib";
import { getPointsSummary } from "../lib/points";
import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { BN } from "@coral-xyz/anchor";

interface ProtocolStats {
  deposits: number;
  borrows: number;
  tvl: number;
  pointsTotal: number;
}

interface JupiterState {
  // State
  initialized: boolean;
  isRefreshingStore: boolean;
  tokenMap: Map<string, TokenInfo>;
  tokenAccountMap: TokenAccountMap;
  connection: Connection | null;
  wallet: Wallet | null;

  //   marginfiClient: MarginfiClient | null;
  //   bankMetadataMap: BankMetadataMap;
  //   tokenMetadataMap: TokenMetadataMap;
  //   extendedBankMetadatas: ExtendedBankMetadata[];
  //   extendedBankInfos: ExtendedBankInfo[];
  //   protocolStats: ProtocolStats;
  //   marginfiAccountCount: number;
  //   selectedAccount: MarginfiAccountWrapper | null;
  //   nativeSolBalance: number;
  //   accountSummary: AccountSummary;

  // Actions
  fetchJupiterState: (args?: { connection?: Connection; wallet?: Wallet }) => Promise<void>;
  setIsRefreshingStore: (isRefreshingStore: boolean) => void;
}

function createJupiterStore() {
  return create<JupiterState>(stateCreator);
}

// function createPersistentJupiterState() {
//   return create<JupiterState, [["zustand/persist", Pick<JupiterState, "extendedBankInfos" | "protocolStats">]]>(
//     persist(stateCreator, {
//       name: "mrgnlend-peristent-store",
//       partialize(state) {
//         return {
//           extendedBankInfos: state.extendedBankInfos,
//           protocolStats: state.protocolStats,
//         };
//       },
//     })
//   );
// }

const stateCreator: StateCreator<JupiterState, [], []> = (set, get) => ({
  // State
  initialized: false,
  isRefreshingStore: false,
  tokenMap: new Map(),
  tokenAccountMap: new Map<string, TokenAccount>(),
  connection: null,
  wallet: null,

  //   marginfiClient: null,
  //   bankMetadataMap: {},
  //   tokenMetadataMap: {},
  //   extendedBankMetadatas: [],
  //   extendedBankInfos: [],
  //   protocolStats: {
  //     deposits: 0,
  //     borrows: 0,
  //     tvl: 0,
  //     pointsTotal: 0,
  //   },
  //   marginfiAccountCount: 0,
  //   selectedAccount: null,
  //   nativeSolBalance: 0,
  //   accountSummary: DEFAULT_ACCOUNT_SUMMARY,

  // Actions
  fetchJupiterState: async (args?: { connection?: Connection; wallet?: Wallet }) => {
    let tokenMap = get().tokenMap;

    if (tokenMap.size <= 1) {
      const preferredTokenListMode: any = "ahha";
      const tokens = await (preferredTokenListMode === "strict"
        ? await fetch("https://token.jup.ag/strict")
        : await fetch("https://token.jup.ag/all")
      ).json();
      const res = new TokenListContainer(tokens);
      const list = res.filterByChainId(101).getList();
      tokenMap = list.reduce((acc, item) => {
        acc.set(item.address, item);
        return acc;
      }, new Map());
    }

    const connection = args?.connection ?? get().connection;
    const wallet = args?.wallet ?? get().wallet;

    if (!connection) throw new Error("Connection not found");

    let nativeSolBalance: number = 0;
    let tokenAccountMap: TokenAccountMap;
    let marginfiAccounts: MarginfiAccountWrapper[] = [];
    let selectedAccount: MarginfiAccountWrapper | null = null;

    if (wallet?.publicKey) {
      const response = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID },
        "confirmed"
      );

      const reducedResult = response.value.map((item: any) => {
        return {
          created: true,
          mint: new PublicKey(item.account.data.parsed.info.mint),
          balance: nativeToUi(new BN(item.account.data.parsed.info.tokenAmount.uiAmount), 0),
        } as TokenAccount;
      });

      tokenAccountMap = new Map(reducedResult.map((tokenAccount: any) => [tokenAccount.mint.toString(), tokenAccount]));
    } else {
      tokenAccountMap = new Map<string, TokenAccount>();
    }

    set({
      initialized: true,
      isRefreshingStore: false,
      tokenAccountMap,
      tokenMap,
      connection,
      wallet,
    });
  },
  setIsRefreshingStore: (isRefreshingStore: boolean) => set({ isRefreshingStore }),
});

export { createJupiterStore };
export type { JupiterState };

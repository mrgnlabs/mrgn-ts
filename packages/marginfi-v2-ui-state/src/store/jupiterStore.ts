import { Wallet, nativeToUi, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { TokenInfo, TokenListContainer } from "@solana/spl-token-registry";
import { Connection, PublicKey } from "@solana/web3.js";
import { TokenAccountMap, TokenAccount } from "../lib";
import { create, StateCreator } from "zustand";
import { BN } from "@coral-xyz/anchor";

interface JupiterState {
  // State
  initialized: boolean;
  isRefreshingStore: boolean;
  tokenMap: Map<string, TokenInfo>;
  tokenAccountMap: TokenAccountMap;
  connection: Connection | null;
  wallet: Wallet | null;

  // Actions
  fetchJupiterState: (args?: { connection?: Connection; wallet?: Wallet }) => Promise<void>;
  setIsRefreshingStore: (isRefreshingStore: boolean) => void;
}

function createJupiterStore() {
  return create<JupiterState>(stateCreator);
}

const stateCreator: StateCreator<JupiterState, [], []> = (set, get) => ({
  // State
  initialized: false,
  isRefreshingStore: false,
  tokenMap: new Map(),
  tokenAccountMap: new Map<string, TokenAccount>(),
  connection: null,
  wallet: null,

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

    let tokenAccountMap: TokenAccountMap;

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
          balance: item.account.data.parsed.info.tokenAmount.uiAmount,
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

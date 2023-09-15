import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { ACCOUNT_SIZE, TOKEN_PROGRAM_ID, Wallet, aprToApy } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { create, StateCreator } from "zustand";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { EPOCHS_PER_YEAR } from "~/utils";
import { TokenInfoMap, TokenListContainer } from "@solana/spl-token-registry";
import { TokenAccount, TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";
import BN from "bn.js";

const NETWORK_FEE_LAMPORTS = 15000; // network fee + some for potential account creation
const SOL_USD_PYTH_ORACLE = new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG");

const SUPPORTED_TOKENS = [
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
];

interface LstState {
  // State
  initialized: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;
  connection: Connection | null;
  wallet: Wallet | null;
  lstData: LstData | null;
  userData: UserData | null;
  jupiterTokenInfo: TokenInfoMap | null;
  userTokenAccounts: TokenAccountMap | null;
  solUsdValue: number | null;

  // Actions
  fetchLstState: (args?: { connection?: Connection; wallet?: Wallet; isOverride?: boolean }) => Promise<void>;
  setIsRefreshingStore: (isRefreshingStore: boolean) => void;
  resetUserData: () => void;
}

function createLstStore() {
  return create<LstState>(stateCreator);
}

interface LstData {
  poolAddress: PublicKey;
  tvl: number;
  projectedApy: number;
  lstSolValue: number;
  solDepositFee: number;
}

interface UserData {
  nativeSolBalance: number;
}

const stateCreator: StateCreator<LstState, [], []> = (set, get) => ({
  // State
  initialized: false,
  userDataFetched: false,
  isRefreshingStore: false,
  connection: null,
  wallet: null,
  lstData: null,
  userData: null,
  jupiterTokenInfo: null,
  userTokenAccounts: null,
  solUsdValue: null,

  // Actions
  fetchLstState: async (args?: { connection?: Connection; wallet?: Wallet }) => {
    try {
      let userDataFetched = false;

      const connection = args?.connection || get().connection;
      if (!connection) throw new Error("Connection not found");

      const wallet = args?.wallet || get().wallet;

      let lstData: LstData | null = null;
      let userData: UserData | null = null;
      let jupiterTokenInfo: TokenInfoMap | null = null;
      let userTokenAccounts: TokenAccountMap | null = null;
      let solUsdValue: number | null = null;
      if (wallet?.publicKey) {
        const [accountsAiList, minimumRentExemption, _lstData, _jupiterTokenInfo, _userTokenAccounts] =
          await Promise.all([
            connection.getMultipleAccountsInfo([wallet.publicKey, SOL_USD_PYTH_ORACLE]),
            connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE),
            fetchLstData(connection),
            fetchJupiterTokenInfo(),
            fetchUserTokenAccounts(connection, wallet.publicKey),
          ]);
        lstData = _lstData;
        jupiterTokenInfo = _jupiterTokenInfo;
        userTokenAccounts = _userTokenAccounts;
        const [walletAi, solUsdPythFeedAi] = accountsAiList;
        const nativeSolBalance = walletAi?.lamports ? walletAi.lamports : 0;
        const availableSolBalance = (nativeSolBalance - minimumRentExemption - NETWORK_FEE_LAMPORTS) / 1e9;
        solUsdValue = vendor.parsePriceData(solUsdPythFeedAi!.data).emaPrice.value;

        userData = { nativeSolBalance: availableSolBalance };
        userDataFetched = true;
      } else {
        const [accountsAiList, _lstData, _jupiterTokenInfo] = await Promise.all([
          connection.getMultipleAccountsInfo([ SOL_USD_PYTH_ORACLE]),
          fetchLstData(connection), fetchJupiterTokenInfo()]);
        lstData = _lstData;
        jupiterTokenInfo = _jupiterTokenInfo;
        const [solUsdPythFeedAi] = accountsAiList;
        solUsdValue = vendor.parsePriceData(solUsdPythFeedAi!.data).emaPrice.value;
      }

      set({
        initialized: true,
        userDataFetched,
        isRefreshingStore: false,
        connection,
        wallet,
        lstData,
        userData,
        jupiterTokenInfo,
        userTokenAccounts,
        solUsdValue,
      });
    } catch (err) {
      console.error("error refreshing state: ", err);
      set({ isRefreshingStore: false });
    }
  },
  setIsRefreshingStore: (isRefreshingStore: boolean) => set({ isRefreshingStore }),
  resetUserData: () => {
    console.log("resetting user data");
    set({ userDataFetched: false, userData: null });
  },
});

async function fetchLstData(connection: Connection): Promise<LstData> {
  const [stakePoolInfo] = await Promise.all([
    solanaStakePool.stakePoolInfo(connection, new PublicKey("5TnTqbrucx4GxLxEqtUUAr3cggE6CKV7nBDuT2bL9Gux")),
  ]);
  const poolTokenSupply = Number(stakePoolInfo.poolTokenSupply);
  const totalLamports = Number(stakePoolInfo.totalLamports);
  const lastPoolTokenSupply = Number(stakePoolInfo.lastEpochPoolTokenSupply);
  const lastTotalLamports = Number(stakePoolInfo.lastEpochTotalLamports);

  const solDepositFee = stakePoolInfo.solDepositFee.denominator.eqn(0)
    ? 0
    : stakePoolInfo.solDepositFee.numerator.toNumber() / stakePoolInfo.solDepositFee.denominator.toNumber();
  const lstSolValue = poolTokenSupply > 0 ? totalLamports / poolTokenSupply : 1;
  const lastLstSolValue = lastPoolTokenSupply > 0 ? lastTotalLamports / lastPoolTokenSupply : 1;
  const epochRate = lstSolValue / lastLstSolValue - 1;
  const apr = epochRate * EPOCHS_PER_YEAR;
  const projectedApy = aprToApy(apr, EPOCHS_PER_YEAR);

  return {
    poolAddress: new PublicKey(stakePoolInfo.address),
    tvl: totalLamports / 1e9,
    projectedApy,
    lstSolValue,
    solDepositFee,
  };
}

async function fetchJupiterTokenInfo(): Promise<TokenInfoMap> {
  const preferredTokenListMode: any = "strict";
  const tokens = await (preferredTokenListMode === "strict"
    ? await fetch("https://token.jup.ag/strict")
    : await fetch("https://token.jup.ag/all")
  ).json();
  const res = new TokenListContainer(tokens);
  const list = res.filterByChainId(101).getList();
  const tokenMap = list
    .filter((tokenInfo) => SUPPORTED_TOKENS.includes(tokenInfo.address))
    .reduce((acc, item) => {
      acc.set(item.address, item);
      return acc;
    }, new Map());

  return tokenMap;
}

async function fetchUserTokenAccounts(connection: Connection, walletAddress: PublicKey): Promise<TokenAccountMap> {
  const response = await connection.getParsedTokenAccountsByOwner(
    walletAddress,
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

  const userTokenAccounts = new Map(
    reducedResult.map((tokenAccount: any) => [tokenAccount.mint.toString(), tokenAccount])
  );
  return userTokenAccounts;
}

export { createLstStore };
export type { LstState };

import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { ACCOUNT_SIZE, TOKEN_PROGRAM_ID, Wallet, aprToApy, uiToNative } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { create, StateCreator } from "zustand";
import * as solanaStakePool from "@solana/spl-stake-pool";
import {
  PERIOD,
  StakeData,
  calcYield,
  fetchAndParsePricesCsv,
  fetchStakeAccounts,
  getPriceRangeFromPeriod,
} from "~/utils";
import { TokenAccount, TokenAccountMap, fetchBirdeyePrices } from "@mrgnlabs/marginfi-v2-ui-state";
import { persist } from "zustand/middleware";
import BN from "bn.js";

import type { TokenInfo, TokenInfoMap } from "@solana/spl-token-registry";
import { QuoteResponseMeta } from "@jup-ag/react-hook";

const STAKEVIEW_APP_URL = "https://stakeview.app/apy/prev3.json";
const BASELINE_VALIDATOR_ID = "mrgn28BhocwdAUEenen3Sw2MR9cPKDpLkDvzDdR7DBD";
const SOLANA_COMPASS_PRICES_URL =
  "https://raw.githubusercontent.com/glitchful-dev/sol-stake-pool-apy/master/db/lst.csv";

export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const LST_MINT = new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp");
const NETWORK_FEE_LAMPORTS = 15000; // network fee + some for potential account creation
const SOL_USD_PYTH_ORACLE = new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG");
const STAKE_POOL_ID = new PublicKey("DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK");

const SUPPORTED_TOKENS = [
  "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  "So11111111111111111111111111111111111111112",
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
];

export type TokenData = Omit<TokenInfo, "logoUri"> & { price: number; balance: BN; iconUrl: string };
export type TokenDataMap = Map<string, TokenData>;

export type SupportedSlippagePercent = 0.1 | 0.5 | 1.0 | 5.0;

interface LstState {
  // State
  initialized: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;
  connection: Connection | null;
  wallet: Wallet | null;
  lstData: LstData | null;
  feesAndRent: number;
  availableLamports: BN | null;
  tokenDataMap: TokenDataMap | null;
  stakeAccounts: StakeData[];
  solUsdValue: number | null;
  slippagePct: SupportedSlippagePercent;
  quoteResponseMeta: QuoteResponseMeta | null;

  // Actions
  fetchLstState: (args?: { connection?: Connection; wallet?: Wallet; isOverride?: boolean }) => Promise<void>;
  setIsRefreshingStore: (isRefreshingStore: boolean) => void;
  resetUserData: () => void;
  setSlippagePct: (slippagePct: SupportedSlippagePercent) => void;
  setQuoteResponseMeta: (quoteResponseMeta: QuoteResponseMeta | null) => void;
}

function createLstStore() {
  return create<LstState, [["zustand/persist", Pick<LstState, "slippagePct">]]>(
    persist(stateCreator, {
      name: "lst-peristent-store",
      partialize(state) {
        return {
          slippagePct: state.slippagePct,
        };
      },
    })
  );
}

export interface LstData {
  poolAddress: PublicKey;
  tvl: number;
  projectedApy: number;
  lstSolValue: number;
  solDepositFee: number;
  accountData: solanaStakePool.StakePool;
  validatorList: PublicKey[];
}

const stateCreator: StateCreator<LstState, [], []> = (set, get) => ({
  // State
  initialized: false,
  userDataFetched: false,
  isRefreshingStore: false,
  connection: null,
  wallet: null,
  lstData: null,
  feesAndRent: 0,
  availableLamports: null,
  tokenDataMap: null,
  stakeAccounts: [],
  solUsdValue: null,
  slippagePct: 1,
  stakePoolProxyProgram: null,
  quoteResponseMeta: null,

  // Actions
  fetchLstState: async (args?: { connection?: Connection; wallet?: Wallet }) => {
    try {
      let userDataFetched = false;

      const connection = args?.connection || get().connection;
      if (!connection) throw new Error("Connection not found");

      const wallet = args?.wallet || get().wallet;

      let availableLamports: BN | null = null;
      let tokenDataMap: TokenDataMap | null = null;
      let solUsdValue: number | null = null;
      let stakeAccounts: StakeData[] = [];
      console.log("Fetching LST data");
      const lstData = await fetchLstData(connection);
      // const minimumRentExemption = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
      // const jupiterTokenInfo = await fetchJupiterTokenInfo();

      if (wallet?.publicKey) {
        // const [accountsAiList, minimumRentExemption, userTokenAccounts, _stakeAccounts] = await Promise.all([
        //   connection.getMultipleAccountsInfo([wallet.publicKey, SOL_USD_PYTH_ORACLE]),
        //   connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE),
        //   fetchUserTokenAccounts(connection, wallet.publicKey),
        //   fetchStakeAccounts(connection, wallet.publicKey),
        // ]);

        // const [walletAi, solUsdPythFeedAi] = accountsAiList;
        // const nativeSolBalance = walletAi?.lamports ? walletAi.lamports : 0;
        // availableLamports = new BN(nativeSolBalance - minimumRentExemption - NETWORK_FEE_LAMPORTS);
        // solUsdValue = vendor.parsePriceData(solUsdPythFeedAi!.data).emaPrice.value;
        // stakeAccounts = _stakeAccounts.filter(
        //   (stakeAccount) =>
        //     stakeAccount.isActive && lstData.validatorList.find((v) => v.equals(stakeAccount.validatorVoteAddress))
        // );

        // tokenDataMap = new Map(
        //   [...jupiterTokenInfo.entries()].map(([tokenMint, tokenInfo]) => {
        //     const { logoURI, ..._tokenInfo } = tokenInfo;

        //     let walletBalance: BN = new BN(0);
        //     const tokenAccount = userTokenAccounts?.get(tokenMint);
        //     walletBalance = uiToNative(tokenAccount?.balance ?? 0, tokenInfo.decimals);

        //     return [
        //       tokenMint,
        //       { ..._tokenInfo, iconUrl: logoURI ?? "/info_icon.png", price: 0, balance: walletBalance },
        //     ];
        //   })
        // );

        userDataFetched = true;
      } else {
        // tokenDataMap = new Map(
        //   [...jupiterTokenInfo.entries()].map(([tokenMint, tokenInfo]) => {
        //     const { logoURI, ..._tokenInfo } = tokenInfo;
        //     return [tokenMint, { ..._tokenInfo, iconUrl: logoURI ?? "/info_icon.png", price: 0, balance: new BN(0) }];
        //   })
        // );
        // const accountsAiList = await connection.getMultipleAccountsInfo([SOL_USD_PYTH_ORACLE]);
        // const [solUsdPythFeedAi] = accountsAiList;
        // solUsdValue = vendor.parsePriceData(solUsdPythFeedAi!.data).emaPrice.value;
      }

      set({
        initialized: true,
        feesAndRent: 0 + NETWORK_FEE_LAMPORTS,
        userDataFetched,
        isRefreshingStore: false,
        connection,
        wallet,
        lstData,
        availableLamports,
        tokenDataMap,
        stakeAccounts,
        solUsdValue,
      });

      // const tokenPrices = await fetchTokenPrices(
      //   [...jupiterTokenInfo.values()].map((tokenInfo) => new PublicKey(tokenInfo.address))
      // );

      // tokenDataMap.forEach((value, key, map) => {
      //   const price = tokenPrices.get(value.address);
      //   value.price = price ?? 0;
      // });

      set({
        tokenDataMap,
      });
    } catch (err) {
      console.error("error refreshing state: ", err);
      set({ isRefreshingStore: false });
    }
  },
  setIsRefreshingStore: (isRefreshingStore: boolean) => set({ isRefreshingStore }),
  resetUserData: () => {
    let tokenDataMap = get().tokenDataMap;
    if (tokenDataMap) {
      tokenDataMap = new Map(
        [...tokenDataMap?.entries()].map(
          ([tokenMint, tokenData]) => [tokenMint, { ...tokenData, balance: new BN(0) }] as [string, TokenData]
        )
      );
    }
    set({ userDataFetched: false, tokenDataMap });
  },
  setSlippagePct: (slippagePct: SupportedSlippagePercent) => set({ slippagePct }),
  setQuoteResponseMeta: (quoteResponseMeta: QuoteResponseMeta | null) => set({ quoteResponseMeta }),
});

async function fetchLstData(connection: Connection): Promise<LstData> {
  const [stakePoolInfo, stakePoolAccount, apyData, solanaCompassPrices] = await Promise.all([
    solanaStakePool.stakePoolInfo(connection, STAKE_POOL_ID),
    solanaStakePool.getStakePoolAccount(connection, STAKE_POOL_ID),
    fetch(STAKEVIEW_APP_URL).then((res) => res.json()),
    fetchAndParsePricesCsv(SOLANA_COMPASS_PRICES_URL),
  ]);
  const stakePool = stakePoolAccount.account.data;

  const poolTokenSupply = Number(stakePoolInfo.poolTokenSupply);
  const totalLamports = Number(stakePoolInfo.totalLamports);
  const lastPoolTokenSupply = Number(stakePoolInfo.lastEpochPoolTokenSupply);
  const lastTotalLamports = Number(stakePoolInfo.lastEpochTotalLamports);

  const solDepositFee = stakePoolInfo.solDepositFee.denominator.eqn(0)
    ? 0
    : stakePoolInfo.solDepositFee.numerator.toNumber() / stakePoolInfo.solDepositFee.denominator.toNumber();

  const lstSolValue = poolTokenSupply > 0 ? totalLamports / poolTokenSupply : 1;

  let projectedApy: number;
  if (lastTotalLamports === 0 || lastPoolTokenSupply === 0) {
    projectedApy = 0.08;
  } else {
    const priceRange = getPriceRangeFromPeriod(solanaCompassPrices, PERIOD.DAYS_7);
    if (!priceRange) {
      throw new Error("No price data found for the specified period!");
    }
    projectedApy = calcYield(priceRange).apy;
  }

  if (projectedApy < 0.08) {
    // temporarily use baseline validator APY waiting for a few epochs to pass
    const baselineValidatorData = apyData.validators.find((validator: any) => validator.id === BASELINE_VALIDATOR_ID);
    if (baselineValidatorData) projectedApy = baselineValidatorData.apy;
  }

  return {
    poolAddress: new PublicKey(stakePoolInfo.address),
    tvl: totalLamports / 1e9,
    projectedApy,
    lstSolValue,
    solDepositFee,
    accountData: stakePool,
    validatorList: stakePoolInfo.validatorList.map((v) => new PublicKey(v.voteAccountAddress)),
  };
}

async function fetchJupiterTokenInfo(): Promise<TokenInfoMap> {
  const preferredTokenListMode: any = "strict";
  const tokens = await (preferredTokenListMode === "strict"
    ? await fetch("https://token.jup.ag/strict")
    : await fetch("https://token.jup.ag/all")
  ).json();

  // Dynamically import TokenListContainer when needed
  const { TokenListContainer } = await import("@solana/spl-token-registry");

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

async function fetchTokenPrices(mints: PublicKey[]): Promise<Map<string, number>> {
  const prices = await fetchBirdeyePrices(mints);
  return new Map(prices.map((price, index) => [mints[index].toString(), price.toNumber()]));
}

export { createLstStore };
export type { LstState };

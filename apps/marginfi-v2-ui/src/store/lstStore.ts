import { ACCOUNT_SIZE, Wallet, aprToApy } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { create, StateCreator } from "zustand";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { EPOCHS_PER_YEAR } from "~/utils";

const NETWORK_FEE_LAMPORTS = 15000; // network fee + some for potential account creation

interface LstState {
  // State
  initialized: boolean;
  userDataFetched: boolean;
  isRefreshingStore: boolean;
  connection: Connection | null;
  wallet: Wallet | null;
  lstData: LstData | null;
  userData: UserData | null;

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

  // Actions
  fetchLstState: async (args?: { connection?: Connection; wallet?: Wallet }) => {
    try {
      let userDataFetched = false;

      const connection = args?.connection || get().connection;
      if (!connection) throw new Error("Connection not found");

      const wallet = args?.wallet || get().wallet;

      let lstData: LstData | null = null;
      let userData: UserData | null = null;
      if (wallet?.publicKey) {
        const [accountsAiList, minimumRentExemption, _lstData] = await Promise.all([
          connection.getMultipleAccountsInfo([wallet.publicKey]),
          connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE),
          fetchLstData(connection),
        ]);
        lstData = _lstData;
        const [walletAi] = accountsAiList;
        const nativeSolBalance = walletAi?.lamports ? walletAi.lamports : 0;
        const availableSolBalance = (nativeSolBalance - minimumRentExemption - NETWORK_FEE_LAMPORTS) / 1e9;

        userData = { nativeSolBalance: availableSolBalance };
        userDataFetched = true;
      } else {
        lstData = await fetchLstData(connection);
      }

      set({
        initialized: true,
        userDataFetched,
        isRefreshingStore: false,
        connection,
        wallet,
        lstData,
        userData,
      });
    } catch (err) {
      console.error("error refreshing state: ", err);
      set({ isRefreshingStore: false });
    }
  },
  setIsRefreshingStore: (isRefreshingStore: boolean) => set({ isRefreshingStore }),
  resetUserData: () => {
    console.log("resetting user data")
    set({ userDataFetched: false, userData: null })},
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

async function fetchTokenData(connection: Connection): Promise<LstData> {
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

export { createLstStore };
export type { LstState };

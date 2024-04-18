import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { ACCOUNT_SIZE, TOKEN_PROGRAM_ID, Wallet, aprToApy, uiToNative } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { create, StateCreator } from "zustand";
import * as solanaStakePool from "@solana/spl-stake-pool";
import {
    LstType,
    PERIOD,
    RepayType,
    StakeData,
    calcYield,
    fetchAndParsePricesCsv,
    fetchStakeAccounts,
    getPriceRangeFromPeriod,
} from "~/utils";
import { ActionType, TokenAccount, TokenAccountMap, fetchBirdeyePrices } from "@mrgnlabs/marginfi-v2-ui-state";
import { persist } from "zustand/middleware";
import BN from "bn.js";

import type { TokenInfo, TokenInfoMap } from "@solana/spl-token-registry";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { LendingModes } from "~/types";

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

interface ActionBoxState {
    // State
    slippageBps: number;
    amount: number;
    amountRaw: string;
    repayAmount: number;
    repayAmountRaw: string;

    actionMode: ActionType;
    repayMode: RepayType;
    lstMode: LstType;

    selectedTokenBank: PublicKey | null;
    selectedStakingAccount: PublicKey | null;
    selectedRepayTokenBank: PublicKey | null;

    isLoading: boolean;

    // Actions
    fetchActionBoxState: (args: {
        lendingMode: LendingModes;
        requestedAction?: ActionType;
        requestedToken?: PublicKey;
    }) => void;
    setSlippageBps: (slippageBps: number) => void;
    setActionMode: (actionMode: ActionType) => void;
    setAmountRaw: (amountRaw: string, maxAmount: number) => void;
    setRepayAmountRaw: (repayAmountRaw: string) => void;
    setSelectedTokenBank: (tokenBank: PublicKey) => void;
    setSelectedStakingAccount: (account: PublicKey) => void;
}

function createActionBoxStore() {
    return create<ActionBoxState, [["zustand/persist", Pick<ActionBoxState, "slippageBps">]]>(
        persist(stateCreator, {
            name: "actionbox-peristent-store",
            partialize(state) {
                return {
                    slippageBps: state.slippageBps,
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

const initialState = {
    slippageBps: 100,
    amountRaw: "",
    amount: 0,
    repayAmountRaw: "",
    repayAmount: 0,

    actionMode: ActionType.Deposit,
    repayMode: RepayType.RepayRaw,
    lstMode: LstType.Token,

    selectedTokenBank: null,
    selectedRepayTokenBank: null,
    selectedStakingAccount: null,

    isLoading: false,
};

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
    // State
    ...initialState,

    fetchActionBoxState(args) {
        let actionMode: ActionType = ActionType.Deposit;
        let selectedTokenBank: PublicKey | null = null;

        if (args.requestedAction) {
            actionMode = args.requestedAction;
        } else {
            if (args.lendingMode === LendingModes.LEND) {
                actionMode = ActionType.Deposit;
            } else {
                actionMode = ActionType.Borrow;
            }
        }

        if (args.requestedToken) {
            selectedTokenBank = args.requestedToken;
        } else {
            selectedTokenBank = null;
        }


    },

    setAmountRaw(amountRaw, maxAmount) {
        const repayMode = get().repayMode;
        const strippedAmount = amountRaw.replace(/,/g, "");
        const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
        const numberFormater = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

        if (amount && amount > maxAmount) {
            set({ amountRaw: numberFormater.format(maxAmount) });
        } else {
            set({ amountRaw: numberFormater.format(amount) });
        }
    },

    setRepayAmountRaw(amountRaw) {
        const strippedAmount = amountRaw.replace(/,/g, "");
        const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

        // if (amount && amount > maxAmount) {
        //     set({ amountRaw: numberFormater.format(maxAmount) })
        // } else {
        //     set({ amountRaw: numberFormater.format(amount) })
        // }
    },

    setSelectedTokenBank(tokenBank) {
        const selectedTokenBank = get().selectedTokenBank;
        const hasBankChanged = !selectedTokenBank || tokenBank.equals(selectedTokenBank);

        if (hasBankChanged) set({ amountRaw: "", amount: 0, repayAmountRaw: "", repayAmount: 0 });
        set({ selectedTokenBank: tokenBank });
    },

    setSelectedStakingAccount(account) {
        set({ selectedStakingAccount: account });
    },

    setSlippageBps(slippageBps) {
        set({ slippageBps });
    },

    setActionMode(actionMode) {
        const selectedActionMode = get().actionMode;
        const hasActionModeChanged = !selectedActionMode || actionMode !== selectedActionMode;

        if (hasActionModeChanged) set({ amountRaw: "", amount: 0, repayAmountRaw: "", repayAmount: 0 });

        if (actionMode !== ActionType.Repay) {
            set({ repayMode: RepayType.RepayRaw });
        }

        if (actionMode === ActionType.Repay) {
            set({ slippageBps: 100 });
        } else {
            set({ slippageBps: 20 });
        }
        set({ actionMode });
    },
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

export { createActionBoxStore };
export type { ActionBoxState };

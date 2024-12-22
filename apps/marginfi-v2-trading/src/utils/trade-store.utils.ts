import { Bank, BankRaw, MarginfiAccount, MarginfiProgram, MintData, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { fetchTokenAccounts, makeExtendedBankInfo, TokenAccount, UserDataProps } from "@mrgnlabs/marginfi-v2-ui-state";
import { BankMetadata, TokenMetadata } from "@mrgnlabs/mrgn-common";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { GetStaticProps } from "next";
import { TokenData } from "~/types";
import { PoolListApiResponse, PoolPositionsApiResponse } from "~/types/api.types";
import { ArenaBank, ArenaPoolPositions, ArenaPoolSummary } from "~/types/trade-store.types";

/**
 * Server-Side Rendering Logic
 *
 * Handles initial data fetching during Next.js SSR/SSG for the Arena trading interface.
 * Loads pool listings and token metadata to bootstrap the client application.
 */

export type InitialArenaState = {
  tokenDetails: TokenData[];
  poolData: PoolListApiResponse[];
};

export interface StaticArenaProps {
  initialData: InitialArenaState;
}

export const getArenaStaticProps: GetStaticProps<StaticArenaProps> = async () => {
  const emptyState: InitialArenaState = {
    poolData: [],
    tokenDetails: [],
  };

  if (process.env.NEXT_PUBLIC_DISABLE_SSR === "true") {
    return {
      props: { initialData: emptyState },
      revalidate: 300, // Revalidate every 5 minutes
    };
  }

  try {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    const initialData = await fetchInitialArenaState(process.env.NEXT_PUBLIC_VERCEL_URL);

    if (!initialData) {
      throw new Error("Failed to fetch initial arena state");
    }

    return {
      props: { initialData },
      revalidate: 300, // Revalidate every 5 minutes
    };
  } catch (error) {
    // Log the specific error for debugging
    console.error("Error in getStaticProps:", error instanceof Error ? error.message : "Unknown error");

    return {
      props: { initialData: emptyState },
      revalidate: 300, // Keep revalidating even in error case
    };
  }
};

/**
 * Fetches initial arena state including pool data and token details from API endpoints
 * @param host Optional host URL, defaults to localhost:3006 if not provided
 * @returns Promise resolving to InitialArenaState containing pool and token data, or undefined if fetch fails
 */
export const fetchInitialArenaState = async (host?: string): Promise<InitialArenaState | undefined> => {
  let arenaState: InitialArenaState;

  const baseUrl = host ? `https://${host}` : "http://localhost:3006";

  try {
    // Fetch all data in parallel using Promise.all
    const [poolData, tokenDetailsData] = await Promise.all([
      fetch(`${baseUrl}/api/pool/list`).then((res) => res.json() as Promise<PoolListApiResponse[]>),
      fetch(`${baseUrl}/api/birdeye/arenaTokens`, {
        headers: {
          origin: baseUrl || "",
          referer: baseUrl || "",
        },
      }).then((res) => res.json()),
    ]);

    arenaState = {
      poolData,
      tokenDetails: tokenDetailsData,
    };

    return arenaState;
  } catch (error) {
    console.error("Failed to fetch cache data:", error);
    return;
  }
};

/**
 * Bank Data Fetching
 *
 * Core bank fetching utilities for trade store:
 * - Bank account data and metadata
 * - Price feeds and oracle data
 * - Token metadata and pricing
 * - Emission mint info
 */

export const fetchBankDataMap = async (
  program: MarginfiProgram,
  bankAddresses: PublicKey[],
  feedIdMap: Map<string, PublicKey>,
  arenaPoolsSummary: Record<string, ArenaPoolSummary>
): Promise<Map<string, Bank>> => {
  const bankAccountsData = await program.account.bank.fetchMultiple(bankAddresses);

  const banksByBankPk = new Map(
    bankAccountsData.map((bankAccount, idx) => {
      const bankData = bankAccount as any as BankRaw;
      const groupPk = bankData.group.toBase58();
      const summary = arenaPoolsSummary[groupPk];
      const bankAddress = bankAddresses[idx];

      if (!summary) {
        throw new Error(`Summary not found for group ${groupPk}`);
      }

      const isQuoteBank = bankAddress.equals(summary.quoteSummary.bankPk);

      const bankSummary = isQuoteBank ? summary.quoteSummary : summary.tokenSummary;

      const meta: BankMetadata = {
        tokenAddress: bankSummary.mint.toBase58(),
        tokenName: bankSummary.tokenName,
        tokenSymbol: bankSummary.tokenSymbol,
      };

      const bank = Bank.fromAccountParsed(bankAddress, bankData, feedIdMap, meta);

      return [bankAddress.toBase58(), bank];
    })
  );
  return banksByBankPk;
};

export const compileBankAndTokenMetadata = (
  oraclePrices: Record<string, OraclePrice>,
  banks: Bank[],
  arenaPoolsSummary: Record<string, ArenaPoolSummary>,
  emissionData: {
    ais: AccountInfo<Buffer>[];
    keys: PublicKey[];
  }
): {
  tokenDatas: Map<string, MintData>;
  priceInfos: Map<string, OraclePrice>;
  banksWithPriceAndToken: {
    bank: Bank;
    oraclePrice: OraclePrice;
    tokenMetadata: TokenMetadata;
  }[];
} => {
  const tokenDatas: Map<string, MintData> = new Map();

  const banksWithPriceAndToken: {
    bank: Bank;
    oraclePrice: OraclePrice;
    tokenMetadata: TokenMetadata;
  }[] = [];

  const priceInfos = new Map(
    banks.map((bank) => {
      const priceData = oraclePrices[bank.address.toBase58()];
      if (!priceData) throw new Error(`Failed to fetch price oracle account for bank ${bank.address.toBase58()}`);
      return [bank.address.toBase58(), priceData as OraclePrice];
    })
  );

  banks.forEach((data, index) => {
    const groupPk = data.group;
    const bankAddress = data.address;
    const mintAddress = data.mint;
    const emissionMint = data.emissionsMint;

    const oraclePrice = priceInfos.get(bankAddress.toBase58());
    if (!oraclePrice) {
      throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
    }

    const summary = arenaPoolsSummary[groupPk.toBase58()];
    if (!summary) {
      throw new Error(`Summary not found for group ${groupPk.toBase58()}`);
    }

    const bankSummary = [summary.tokenSummary, summary.quoteSummary].find((s) => s.bankPk.equals(bankAddress));
    if (!bankSummary) {
      throw new Error(`Bank summary not found for bank ${bankAddress.toBase58()}`);
    }

    let emissionTokenProgram: PublicKey | null = null;
    if (!emissionMint.equals(PublicKey.default)) {
      const emissionMintDataRawIndex = emissionData.keys.findIndex((pk) => pk.equals(emissionMint));
      emissionTokenProgram = emissionMintDataRawIndex >= 0 ? emissionData.ais[emissionMintDataRawIndex].owner : null;
    }
    // TODO: parse extension data to see if there is a fee
    tokenDatas.set(bankAddress.toBase58(), {
      mint: mintAddress,
      tokenProgram: bankSummary.tokenProgram,
      feeBps: 0,
      emissionTokenProgram,
    });

    banksWithPriceAndToken.push({
      bank: data,
      oraclePrice,
      tokenMetadata: { icon: bankSummary.tokenLogoUri, name: bankSummary.tokenName, symbol: bankSummary.tokenSymbol },
    });
  });

  return {
    tokenDatas,
    priceInfos,
    banksWithPriceAndToken,
  };
};

export const compileExtendedArenaBank = (
  banksWithPriceAndToken: {
    bank: Bank;
    oraclePrice: OraclePrice;
    tokenMetadata: TokenMetadata;
  }[],
  tokenDataByMint: Record<string, TokenData>
): ArenaBank[] => {
  return banksWithPriceAndToken.map(({ bank, oraclePrice, tokenMetadata }) => {
    const extendedBankInfo = makeExtendedBankInfo(tokenMetadata, bank, oraclePrice);
    const mintAddress = bank.mint.toBase58();
    const tokenData = tokenDataByMint[mintAddress];
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
  });
};

export const updateArenaBankWithUserData = async (
  connection: Connection,
  owner: PublicKey,
  program: MarginfiProgram,
  arenaBanks: ArenaBank[],
  tokenDatas: Map<string, MintData>,
  priceInfos: Map<string, OraclePrice>,
  banksByBankPk: Map<string, Bank>,
  groupPk?: PublicKey
): Promise<{
  updatedArenaBanks: ArenaBank[];
  nativeSolBalance: number;
  tokenAccountMap: Map<string, TokenAccount>;
  updateMarginfiAccounts: Record<string, MarginfiAccount>;
}> => {
  const updateMarginfiAccounts: Record<string, MarginfiAccount> = {};
  const banks = Array.from(banksByBankPk.values());

  const bankInfos = [...banks.values()].map((bank) => ({
    mint: bank.mint,
    mintDecimals: bank.mintDecimals,
    bankAddress: bank.address,
  }));

  // fetch
  const [tokenAccounts] = await Promise.all([fetchTokenAccounts(connection, owner, bankInfos, tokenDatas)]);

  const nativeSolBalance = tokenAccounts.nativeSolBalance;
  const tokenAccountMap = tokenAccounts.tokenAccountMap;

  const MARGINFI_GROUP_OFFSET = 8; // After account discriminator
  const OWNER_OFFSET = MARGINFI_GROUP_OFFSET + 32; // After group pubkey

  const filters = [
    {
      memcmp: {
        bytes: owner.toBase58(),
        offset: OWNER_OFFSET,
      },
    },
  ];

  if (groupPk) {
    filters.unshift({
      memcmp: {
        bytes: groupPk.toBase58(),
        offset: MARGINFI_GROUP_OFFSET,
      },
    });
  }

  const accounts = await program.account.marginfiAccount.all(filters);

  accounts.forEach((a) => {
    const groupKey = a.account.group.toBase58();
    const account = new MarginfiAccount(a.publicKey, a.account);
    const existingAccount = updateMarginfiAccounts[groupKey];

    if (existingAccount) {
      const isUpdateAccount = existingAccount.activeBalances.length < account.activeBalances.length;

      if (isUpdateAccount) {
        updateMarginfiAccounts[groupKey] = account;
      }
    } else {
      updateMarginfiAccounts[groupKey] = account;
    }
  });

  const updatedArenaBanks = arenaBanks.map((bankInfo) => {
    const marginfiAccount = updateMarginfiAccounts[bankInfo.info.rawBank.group.toBase58()] ?? null;
    const tokenAccount = tokenAccountMap?.get(bankInfo.info.rawBank.mint.toBase58());

    const userData: UserDataProps | undefined = tokenAccount
      ? { nativeSolBalance, marginfiAccount, banks: banksByBankPk, oraclePrices: priceInfos, tokenAccount }
      : undefined;

    return recompileArenaBank(bankInfo, userData);
  });
  return { updatedArenaBanks, nativeSolBalance, tokenAccountMap, updateMarginfiAccounts };
};

export const resetArenaBank = (bank: ArenaBank): ArenaBank => {
  const updatedBankInfo = recompileArenaBank(bank);
  return { ...updatedBankInfo };
};

const recompileArenaBank = (bank: ArenaBank, userData?: any) => {
  const updatedBankInfo = makeExtendedBankInfo(
    { icon: bank.meta.tokenLogoUri, name: bank.meta.tokenName, symbol: bank.meta.tokenSymbol },
    bank.info.rawBank,
    bank.info.oraclePrice,
    undefined,
    userData
  );

  return {
    ...updatedBankInfo,
    tokenData: bank.tokenData,
  };
};

export const fetchUserPositions = async (owner: PublicKey): Promise<ArenaPoolPositions[]> => {
  try {
    const response = await fetch(`/api/pool/positions?address=${owner.toBase58()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user positions: ${response.statusText}`);
    }

    const data: PoolPositionsApiResponse[] = await response.json();

    return parseUserPositions(data);
  } catch (error) {
    console.error("Error fetching user positions:", error);
    return parseUserPositions([
      {
        group: "CKSTEW68MkS9HUGeAv8qAFNMzFvweW5gKkraVAzhBNz1",
        address: "6TB9QUnU5TV9zjrqMzpBDxdnPoQnxqGfKjXWJqiWaP3K",
        base_bank: {
          address: "ATePKG1xadGgLFS9d4aR8PbQTDxsiuw1gzeiHVpwpgTS",
          start_amount: 0.000641517,
          start_usd_amount: 0.18303113828796,
          current_amount: 0.000642137,
          current_usd_amount: 0.18967855,
          pnl: 0.006647411712040002,
          interest: 6.200000000000042e-7,
        },
        quote_banks: [
          {
            address: "4dUia8ru6fazJJr6xjpiH8VTbuMmtqTLKcQEQKw2YHPN",
            start_amount: 2.246171674,
            start_usd_amount: 1.9359164038141576,
            current_amount: 2.246389742,
            current_usd_amount: 1.753152156,
            pnl: -0.18276424781415757,
            interest: 0.00021806799999968263,
          },
        ],
        entry_price: 285.30988,
        current_position_value: -1.563473606,
        pnl: 0.18941165952619765,
      },
      {
        group: "5t49wKo5yHedvLCkYEFhTwe1V8tUXGBWKvhBbhqW7NdJ",
        address: "24Mwg3YmRXvE7ehSPNLpmXTo82BwJjh7jitB4jMLAvGa",
        base_bank: {
          address: "AWiMcY6NZyNzsAKrJJ24ywF38FqMmZQeReXNXXCn7Gt9",
          start_amount: 0.065719957,
          start_usd_amount: 0.00054966726195746,
          current_amount: 0.06585,
          current_usd_amount: 0.000550755,
          pnl: 1.0877380425400448e-6,
          interest: 0.00013004300000001023,
        },
        quote_banks: [
          {
            address: "4Bobu53fz6oeeezNax8gpXCgapNDYARqJ1L9DyMh2wYv",
            start_amount: 0.001,
            start_usd_amount: 0.00099996345,
            current_amount: 0.001,
            current_usd_amount: 0.000999989,
            pnl: 2.5550000000039083e-8,
            interest: 0.0,
          },
        ],
        entry_price: 0.00836378,
        current_position_value: -0.00044923399999999996,
        pnl: 1.0621880425400057e-6,
      },
      {
        group: "2b27K6FRU1NPTyBBZBhbGpb5wP7jwzQfumYXFZDgHBiz",
        address: "5kWRngv5ReuXEhf6r8H5dxhdtAQAqCHAJ26c83H73hyg",
        base_bank: {
          address: "4F7KP1gGeJGSFjQaTD54Zfd6o5UhLKYQUZGxapTszkGV",
          start_amount: 688.6370147,
          start_usd_amount: 1.957264782290781,
          current_amount: 688.6370147,
          current_usd_amount: 1.943687981,
          pnl: -0.013576801290780871,
          interest: 0.0,
        },
        quote_banks: [
          {
            address: "CESW47a4scrro6Jrv7dvjNkmDJHNdHVKwHi6Rb9dqmeK",
            start_amount: 3.933704,
            start_usd_amount: 3.93357312566792,
            current_amount: 3.933704,
            current_usd_amount: 3.933634177,
            pnl: 0.00006105133208000879,
            interest: 0.0,
          },
        ],
        entry_price: 0.00284223,
        current_position_value: -1.989946196,
        pnl: -0.01363785262286088,
      },
      {
        group: "G1rt3EpQ43K3bY457rhukQGRAo2QxydFAGRKqnjKzyr5",
        address: "6ben3uGYV8MdP3LQeWp3sCfJBZ8jAWopg2hA7E6bane5",
        base_bank: {
          address: "Dj3PndQ3j1vuga5ApiFWWAfQ4h3wBtgS2SeLZBT2LD4g",
          start_amount: 14.535655733,
          start_usd_amount: 0.43402668557672686,
          current_amount: 14.535655733,
          current_usd_amount: 0.43402663,
          pnl: -5.557672683176307e-8,
          interest: 0.0,
        },
        quote_banks: [
          {
            address: "A7vBgCowCYeja7GTc3pyqUBdC9Gkue2gWaMjGZW38meM",
            start_amount: 0.999999919,
            start_usd_amount: 0.999972499002221,
            current_amount: 0.999999919,
            current_usd_amount: 0.999979999,
            pnl: 7.499997779047973e-6,
            interest: 0.0,
          },
        ],
        entry_price: 0.02985945,
        current_position_value: -0.565953369,
        pnl: -7.5555745059352475e-6,
      },
    ]);
    // throw error;
  }
};

const parseUserPositions = (data: PoolPositionsApiResponse[]): ArenaPoolPositions[] => {
  return data.map((pool) => ({
    groupPk: new PublicKey(pool.group),
    accountPk: new PublicKey(pool.address),
    quoteSummary: {
      bankPk: new PublicKey(pool.quote_banks[0].address),
      startAmount: pool.quote_banks[0].start_amount,
      startUsdAmount: pool.quote_banks[0].start_usd_amount,
      currentAmount: pool.quote_banks[0].current_amount,
      currentUsdAmount: pool.quote_banks[0].current_usd_amount,
      pnl: pool.quote_banks[0].pnl,
      interest: pool.quote_banks[0].interest,
    },
    tokenSummary: {
      bankPk: new PublicKey(pool.base_bank.address),
      startAmount: pool.base_bank.start_amount,
      startUsdAmount: pool.base_bank.start_usd_amount,
      currentAmount: pool.base_bank.current_amount,
      currentUsdAmount: pool.base_bank.current_usd_amount,
      pnl: pool.base_bank.pnl,
      interest: pool.base_bank.interest,
    },
    entryPrice: pool.entry_price,
    currentPositionValue: pool.current_position_value,
    pnl: pool.pnl,
  }));
};

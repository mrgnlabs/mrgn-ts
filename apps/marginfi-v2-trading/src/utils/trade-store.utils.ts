import { Bank, BankRaw, MarginfiAccount, MarginfiProgram, MintData, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { fetchTokenAccounts, makeExtendedBankInfo, TokenAccount, UserDataProps } from "@mrgnlabs/marginfi-v2-ui-state";
import { BankMetadata, TokenMetadata } from "@mrgnlabs/mrgn-common";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { GetStaticProps } from "next";
import { TokenData } from "~/types";
import { PoolListApiResponse } from "~/types/api.types";
import { ArenaBank, ArenaPoolSummary } from "~/types/trade-store.types";

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

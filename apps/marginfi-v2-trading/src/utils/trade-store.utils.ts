import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { GetStaticProps, NextApiRequest } from "next";

import {
  Bank,
  BankRaw,
  MarginfiAccount,
  MarginfiProgram,
  MintData,
  OraclePrice,
  PythPushFeedIdMap,
} from "@mrgnlabs/marginfi-client-v2";
import { makeExtendedBankInfo, TokenAccount, TokenAccountMap, UserDataProps } from "@mrgnlabs/mrgn-state";
import {
  BankMetadata,
  getAssociatedTokenAddressSync,
  nativeToUi,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenMetadata,
  unpackAccount,
} from "@mrgnlabs/mrgn-common";
import { ArenaGroupStatus } from "@mrgnlabs/mrgn-utils";

import { TOKEN_ICON_BASE_URL } from "~/config/trade";
import { PoolListApiResponse, PoolPnlApiResponse, PoolPositionsApiResponse } from "~/types/api.types";
import {
  ArenaBank,
  ArenaPoolPnl,
  ArenaPoolPositions,
  ArenaPoolSummary,
  ArenaPoolV2,
  TokenVolumeData,
} from "~/types/trade-store.types";
import BN from "bn.js";

/**
 * Server-Side Rendering Logic
 *
 * Handles initial data fetching during Next.js SSR/SSG for the Arena trading interface.
 * Loads pool listings and token metadata to bootstrap the client application.
 */

export type InitialArenaState = {
  tokenVolumeData: TokenVolumeData[];
  poolData: PoolListApiResponse[];
};

export interface StaticArenaProps {
  initialData: InitialArenaState;
  groupPk: string | null;
  baseUrl: string;
}

export const getArenaStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3006" : "https://staging.thearena.trade");

  const emptyState: InitialArenaState = {
    poolData: [],
    tokenVolumeData: [],
  };

  let groupPk: string | null = null;
  if (context.params?.symbol) {
    groupPk = context.params.symbol as string;
  }

  // Default metadata
  const metadata = {
    title: "The Arena - Memecoin trading with leverage",
    description: "Memecoin trading, with leverage.",
    image: `${baseUrl}/metadata/metadata-image-default.png`,
  };

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NEXT_PUBLIC_DISABLE_SSR === "true") {
    return {
      props: { initialData: emptyState, groupPk, baseUrl, metadata },
      revalidate: 300, // Revalidate every 5 minutes
    };
  }

  try {
    const initialData = await fetchInitialArenaState(baseUrl);

    if (!initialData) {
      throw new Error("Failed to fetch initial arena state");
    }

    if (groupPk) {
      const poolData = initialData.poolData.find((pool) => pool.group === groupPk);

      if (poolData) {
        const tokenSymbol = poolData.base_bank.mint.symbol;
        const quoteSymbol = poolData.quote_bank.mint.symbol;
        const tokenImageUrl = `${TOKEN_ICON_BASE_URL}${poolData.base_bank.mint.address}.png`;
        const quoteImageUrl = `${TOKEN_ICON_BASE_URL}${poolData.quote_bank.mint.address}.png`;
        metadata.title = `Trade ${tokenSymbol}/${quoteSymbol} with leverage in The Arena.`;
        metadata.description = `Trade ${tokenSymbol} / ${quoteSymbol} with leverage in The Arena.`;
        metadata.image = `${baseUrl}/api/share-image/generate?tokenSymbol=${tokenSymbol}&tokenImageUrl=${tokenImageUrl}&quoteTokenSymbol=${quoteSymbol}&quoteTokenImageUrl=${quoteImageUrl}`;
      }
    }

    return {
      props: { initialData, groupPk, baseUrl, metadata },
      revalidate: 300, // Revalidate every 5 minutes
    };
  } catch (error) {
    console.error("Error in getArenaStaticProps:", error);

    return {
      props: { initialData: emptyState, groupPk, baseUrl, metadata },
      revalidate: 300, // Keep revalidating even in error case
    };
  }
};

/**
 * Fetches initial arena state including pool data and token details from API endpoints
 * @param host Optional host URL, defaults to localhost:3006 if not provided
 * @returns Promise resolving to InitialArenaState containing pool and token data, or undefined if fetch fails
 */
export const fetchInitialArenaState = async (baseUrl?: string): Promise<InitialArenaState | undefined> => {
  let arenaState: InitialArenaState;

  baseUrl =
    baseUrl || process.env.NODE_ENV === "development" ? "http://localhost:3006" : "https://staging.thearena.trade";

  try {
    // Fetch all data in parallel using Promise.all
    const [poolData, tokenVolumeData] = await Promise.all([
      fetch(`${baseUrl}/api/pool/list`).then((res) => res.json() as Promise<PoolListApiResponse[]>),
      fetch(`${baseUrl}/api/token/arenaTokens`, {
        headers: {
          origin: baseUrl || "",
          referer: baseUrl || "",
        },
      }).then((res) => res.json()),
    ]);

    arenaState = {
      poolData,
      tokenVolumeData,
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
  feedIdMap: PythPushFeedIdMap,
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
      tokenMetadata: {
        icon: bankSummary.tokenLogoUri,
        name: bankSummary.tokenName,
        symbol: bankSummary.tokenSymbol,
        address: bankSummary.mint.toBase58(),
        decimals: data.mintDecimals,
      },
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
  tokenVolumeDataByMint: Record<string, TokenVolumeData>
): ArenaBank[] => {
  return banksWithPriceAndToken.map(({ bank, oraclePrice, tokenMetadata }) => {
    const extendedBankInfo = makeExtendedBankInfo(tokenMetadata, bank, oraclePrice, undefined, undefined, true);
    const mintAddress = bank.mint.toBase58();
    const tokenVolumeData = tokenVolumeDataByMint[mintAddress];
    if (!tokenVolumeData) {
      console.error("Failed to parse token data");
    }

    const extendedArenaBank = {
      ...extendedBankInfo,
      tokenData: {
        price: tokenVolumeData.price,
        priceChange24hr: tokenVolumeData.priceChange24h,
        volume24hr: tokenVolumeData.volume24h,
        volumeChange24hr: tokenVolumeData.volumeChange24h,
        marketCap: tokenVolumeData.marketcap,
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
  const [tokenAccounts] = await Promise.all([fetchTokenAccounts(connection, owner, bankInfos, tokenDatas, false)]);

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
    const account = MarginfiAccount.fromAccountParsed(a.publicKey, a.account);
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
    {
      icon: bank.meta.tokenLogoUri,
      name: bank.meta.tokenName,
      symbol: bank.meta.tokenSymbol,
      address: bank.info.rawBank.mint.toBase58(),
      decimals: bank.info.rawBank.mintDecimals,
    },
    bank.info.rawBank,
    bank.info.oraclePrice,
    undefined,
    userData,
    true
  );

  return {
    ...updatedBankInfo,
    tokenData: bank.tokenData,
  };
};

export const fetchUserPnl = async (owner: PublicKey): Promise<ArenaPoolPnl[]> => {
  try {
    const response = await fetch(`/api/pool/pnl?address=${owner.toBase58()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user pnl data: ${response.statusText}`);
    }

    const data: PoolPnlApiResponse[] = await response.json();

    return parseUserPnl(data);
  } catch (error) {
    console.error("Error fetching user pnl data:", error);
    return [];
  }
};

const parseUserPnl = (data: PoolPnlApiResponse[]): ArenaPoolPnl[] => {
  return data.map((pool) => ({
    groupPk: new PublicKey(pool.group),
    realizedPnl: pool.realized_pnl,
    unrealizedPnl: pool.unrealized_pnl,
    totalPnl: pool.total_pnl,
    currentPosition: pool.current_position,
    markPrice: pool.mark_price,
    quotePriceUsd: pool.quote_price_usd,
    entryPrices: pool.entry_prices,
    realizedPnlUsd: pool.realized_pnl_usd,
    unrealizedPnlUsd: pool.unrealized_pnl_usd,
    totalPnlUsd: pool.total_pnl_usd,
  }));
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
    return [];
  }
};

const parseUserPositions = (data: PoolPositionsApiResponse[]): ArenaPoolPositions[] => {
  return data.map((pool) => ({
    groupPk: new PublicKey(pool.group),
    authorityPk: new PublicKey(pool.authority),
    accountPk: new PublicKey(pool.address),
    direction: pool.direction === "long" ? "long" : "short",
    entryPrice: pool.entry_price,
    currentPositionValue: pool.position_value,
  }));
};

export function getPoolPositionStatus(pool: ArenaPoolV2, tokenBank: ArenaBank, quoteBank: ArenaBank): ArenaGroupStatus {
  let isLpPosition = true;
  let hasAnyPosition = false;
  let isLendingInAny = false;
  let isLong = false;
  let isShort = false;

  if (tokenBank.isActive && tokenBank.position) {
    hasAnyPosition = true;
    if (tokenBank.position.isLending) {
      isLendingInAny = true;
    } else if (tokenBank.position.usdValue > 0) {
      isShort = true;
      isLpPosition = false;
    }
  }

  if (quoteBank.isActive && quoteBank.position) {
    hasAnyPosition = true;
    if (quoteBank.position.isLending) {
      isLendingInAny = true;
    } else if (quoteBank.position.usdValue > 0) {
      if (tokenBank.isActive && tokenBank.position && tokenBank.position.isLending) {
        isLong = true;
      }
      isLpPosition = false;
    }
  }

  let status = ArenaGroupStatus.EMPTY;

  if (hasAnyPosition) {
    if (isLpPosition && isLendingInAny) {
      status = ArenaGroupStatus.LP;
    } else if (isLong) {
      status = ArenaGroupStatus.LONG;
    } else if (isShort) {
      status = ArenaGroupStatus.SHORT;
    }
  }

  return status;
}

async function fetchTokenAccounts(
  connection: Connection,
  walletAddress: PublicKey,
  bankInfos: { mint: PublicKey; mintDecimals: number; bankAddress: PublicKey; assetTag?: number }[],
  mintDatas: Map<string, MintData>,
  fetchStakeAccounts: boolean = true
): Promise<{
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
}> {
  // Get relevant addresses
  const mintList = bankInfos.map((bank) => ({
    address: bank.mint,
    decimals: bank.mintDecimals,
    bankAddress: bank.bankAddress,
    assetTag: bank.assetTag,
  }));

  if (walletAddress === null) {
    const emptyTokenAccountMap = new Map(
      mintList.map(({ address }) => [
        address.toBase58(),
        {
          created: false,
          mint: address,
          balance: 0,
        },
      ])
    );

    return {
      nativeSolBalance: 0,
      tokenAccountMap: emptyTokenAccountMap,
    };
  }

  const ataAddresses = mintList.map((mint) => {
    const mintData = mintDatas.get(mint.bankAddress.toBase58());
    if (!mintData) {
      throw new Error(`Failed to find mint data for ${mint.bankAddress.toBase58()}`);
    }
    return getAssociatedTokenAddressSync(mint.address, walletAddress!, true, mintData.tokenProgram);
  }); // We allow off curve addresses here to support Fuse.

  // Fetch relevant accounts

  // temporary logic
  const maxAccounts = 100;
  const totalArray: PublicKey[] = [walletAddress, ...ataAddresses];

  function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  const chunkedArrays = chunkArray(totalArray, maxAccounts);

  const accountsAiList = (
    await Promise.all(chunkedArrays.map((chunk) => connection.getMultipleAccountsInfo(chunk)))
  ).flat();

  // Decode account buffers
  const [walletAi, ...ataAiList] = accountsAiList;
  const nativeSolBalance = walletAi?.lamports ? walletAi.lamports / 1e9 : 0;

  const ataList: TokenAccount[] = ataAiList.map((ai, index) => {
    const mint = mintList[index];

    // if user has no stake account for this validator, return 0
    if (mint.assetTag === 2) {
      return {
        created: false,
        mint: mint.address,
        balance: 0,
      };
    }

    if (!ai || (!ai?.owner?.equals(TOKEN_PROGRAM_ID) && !ai?.owner?.equals(TOKEN_2022_PROGRAM_ID))) {
      return {
        created: false,
        mint: mint.address,
        balance: 0,
      };
    }

    const mintData = mintDatas.get(mint.bankAddress.toBase58());
    if (!mintData) {
      throw new Error(`Failed to find mint data for ${mint.bankAddress.toBase58()}`);
    }

    const decoded = unpackAccount(ataAddresses[index], ai, mintData.tokenProgram);

    return {
      created: true,
      mint: decoded.mint,
      balance: nativeToUi(new BN(decoded.amount.toString()), mintList[index].decimals),
    };
  });

  return { nativeSolBalance, tokenAccountMap: new Map(ataList.map((ata) => [ata.mint.toString(), ata])) };
}

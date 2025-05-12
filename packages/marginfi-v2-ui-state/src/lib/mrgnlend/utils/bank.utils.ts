import { PublicKey, Connection } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  Bank,
  OraclePrice,
  PriceBias,
  RiskTier,
  MarginfiAccountWrapper,
  MarginRequirementType,
  EmodeTag,
  MarginfiConfig,
} from "@mrgnlabs/marginfi-client-v2";
import {
  nativeToUi,
  MintLayout,
  TokenMetadata,
  WSOL_MINT,
  floor,
  ceil,
  uiToNative,
  loadBankMetadatas,
  BankMetadataMap,
  TokenMetadataMap,
  loadTokenMetadatas,
  BankMetadata,
  loadStakedBankMetadatas,
} from "@mrgnlabs/mrgn-common";

import {
  TokenPrice,
  BankState,
  Emissions,
  ExtendedBankInfo,
  TokenPriceMap,
  BankInfo,
  LendingPosition,
  ExtendedBankMetadata,
  UserDataProps,
  UserDataRawProps,
  UserDataWrappedProps,
  MakeLendingPositionProps,
  MakeLendingPositionRawProps,
  MakeLendingPositionWrappedProps,
  StakePoolMetadata,
  EmodePair,
} from "../types";
import { fetchBirdeyePrices } from "./account.utils";
import { stagingStaticBankMetadata, stagingStaticTokenMetadata, VOLATILITY_FACTOR } from "../consts";
import { FEE_MARGIN } from "../../../constants";

function makeBankInfo(bank: Bank, oraclePrice: OraclePrice, emissionTokenData?: TokenPrice): BankState {
  const { lendingRate, borrowingRate } = bank.computeInterestRates();
  const totalDeposits = nativeToUi(bank.getTotalAssetQuantity(), bank.mintDecimals);
  const totalBorrows = nativeToUi(bank.getTotalLiabilityQuantity(), bank.mintDecimals);
  const liquidity = totalDeposits - totalBorrows;
  const utilizationRate = bank.computeUtilizationRate().times(100).toNumber();

  let emissionsRate: number = 0;
  let emissions = Emissions.Inactive;

  if ((bank.emissionsActiveLending || bank.emissionsActiveBorrowing) && emissionTokenData) {
    const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionTokenData.decimals));

    emissionsRate = emissionsRateAmount.toNumber();

    if (bank.emissionsActiveBorrowing) {
      emissions = Emissions.Borrowing;
    } else if (bank.emissionsActiveLending) {
      emissions = Emissions.Lending;
    }
  }

  return {
    price: bank.getPrice(oraclePrice, PriceBias.None).toNumber(),
    mint: bank.mint,
    mintDecimals: bank.mintDecimals,
    lendingRate: isNaN(lendingRate.toNumber()) ? 0 : lendingRate.toNumber(),
    borrowingRate: isNaN(borrowingRate.toNumber()) ? 0 : borrowingRate.toNumber(),
    emissionsRate,
    emissions,
    totalDeposits,
    depositCap: nativeToUi(bank.config.depositLimit, bank.mintDecimals),
    totalBorrows,
    borrowCap: nativeToUi(bank.config.borrowLimit, bank.mintDecimals),
    availableLiquidity: liquidity,
    utilizationRate,
    isIsolated: bank.config.riskTier === RiskTier.Isolated,
    hasEmode: bank.emode.emodeTag !== EmodeTag.UNSET,
  };
}

async function makeExtendedBankEmission(
  banks: ExtendedBankInfo[],
  extendedBankMetadatas: ExtendedBankMetadata[],
  tokenMap: TokenPriceMap,
  apiKey?: string
): Promise<[ExtendedBankInfo[], ExtendedBankMetadata[], TokenPriceMap | null]> {
  const emissionsMints = Object.keys(tokenMap).map((key) => new PublicKey(key));
  let birdeyePrices: null | BigNumber[] = emissionsMints.map(() => new BigNumber(0));

  try {
    birdeyePrices = await fetchBirdeyePrices(emissionsMints, apiKey);
  } catch (err) {
    console.log("Failed to fetch emissions prices from Birdeye", err);
    birdeyePrices = null;
  }

  emissionsMints.map((mint, idx) => {
    tokenMap[mint.toBase58()] = {
      ...tokenMap[mint.toBase58()],
      price: birdeyePrices ? birdeyePrices[idx] : new BigNumber(0),
    };
  });

  const updatedBanks = banks.map((bank) => {
    const rawBank = bank.info.rawBank;
    const emissionTokenData = tokenMap[rawBank.emissionsMint.toBase58()];
    let emissionsRate: number = 0;
    let emissions = Emissions.Inactive;
    if ((rawBank.emissionsActiveLending || rawBank.emissionsActiveBorrowing) && emissionTokenData) {
      const emissionsRateAmount = new BigNumber(nativeToUi(rawBank.emissionsRate, emissionTokenData.decimals));
      emissionsRate = emissionsRateAmount.toNumber();

      if (rawBank.emissionsActiveBorrowing) {
        emissions = Emissions.Borrowing;
      } else if (rawBank.emissionsActiveLending) {
        emissions = Emissions.Lending;
      }

      bank.info.state = {
        ...bank.info.state,
        emissionsRate,
        emissions,
      };
    }
    return bank;
  });

  const sortedExtendedBankInfos = updatedBanks.sort(
    (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
  );

  const sortedExtendedBankMetadatas = extendedBankMetadatas.sort((am, bm) => {
    const a = sortedExtendedBankInfos.find((a) => a.address.equals(am.address))!;
    const b = sortedExtendedBankInfos.find((b) => b.address.equals(bm.address))!;
    if (!a || !b) return 0;
    return b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price;
  });

  return [sortedExtendedBankInfos, sortedExtendedBankMetadatas, birdeyePrices ? tokenMap : null];
}

async function makeEmissionsPriceMap(
  banks: Bank[],
  connection: Connection,
  emissionTokenMap: TokenPriceMap | null
): Promise<TokenPriceMap> {
  const banksWithEmissions = banks.filter((bank) => !bank.emissionsMint.equals(PublicKey.default));
  const emissionsMints = banksWithEmissions.map((bank) => bank.emissionsMint);

  const mintAis = await connection.getMultipleAccountsInfo(emissionsMints);

  const mint = mintAis.map((ai) => MintLayout.decode(ai!.data));
  const emissionsPrices = banksWithEmissions.map((bank, i) => ({
    mint: bank.emissionsMint,
    price: emissionTokenMap
      ? (emissionTokenMap[bank.emissionsMint.toBase58()]?.price ?? new BigNumber(0))
      : new BigNumber(0),
    decimals: mint[0].decimals,
  }));

  const tokenMap: TokenPriceMap = {};
  for (let { mint, price, decimals } of emissionsPrices) {
    tokenMap[mint.toBase58()] = { price, decimals };
  }

  return tokenMap;
}

function makeExtendedBankMetadata(
  bank: Bank,
  tokenMetadata: TokenMetadata,
  overrideIcon?: boolean,
  stakePoolMetadata?: StakePoolMetadata
): ExtendedBankMetadata {
  let stakedAsset: StakePoolMetadata | undefined;
  const isStakedAsset = bank.config.assetTag === 2;

  // add staked asset metadata
  if (isStakedAsset && stakePoolMetadata) {
    stakedAsset = stakePoolMetadata;
  }

  return {
    address: bank.address,
    tokenSymbol: tokenMetadata.symbol,
    tokenName: tokenMetadata.name,
    tokenLogoUri: overrideIcon
      ? (tokenMetadata.icon ??
        "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${bank.mint.toBase58()}.png")
      : `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${bank.mint.toBase58()}.png`,
    stakePool: stakedAsset,
  };
}

function makeExtendedBankInfo(
  tokenMetadata: TokenMetadata,
  bank: Bank,
  oraclePrice: OraclePrice,
  emissionTokenPrice?: TokenPrice,
  userData?: UserDataProps,
  overrideIcon?: boolean,
  stakePoolMetadata?: StakePoolMetadata
): ExtendedBankInfo {
  function isUserDataRawProps(userData: UserDataWrappedProps | UserDataRawProps): userData is UserDataRawProps {
    return (
      (userData as UserDataRawProps).banks !== undefined && (userData as UserDataRawProps).oraclePrices !== undefined
    );
  }

  // Aggregate user-agnostic bank info
  const meta = makeExtendedBankMetadata(bank, tokenMetadata, overrideIcon, stakePoolMetadata);
  const bankInfo = makeBankInfo(bank, oraclePrice, emissionTokenPrice);
  let state: BankInfo = {
    rawBank: bank,
    oraclePrice,
    state: bankInfo,
  };

  if (!userData) {
    const userInfo = {
      tokenAccount: {
        created: false,
        mint: bank.mint,
        balance: 0,
      },
      maxDeposit: 0,
      maxRepay: 0,
      maxWithdraw: 0,
      maxBorrow: 0,
    };
    return {
      address: bank.address,
      meta,
      info: state,
      userInfo,
      isActive: false,
    };
  }

  // Calculate user-specific info relevant regardless of whether they have an active position in this bank
  const isWrappedSol = bankInfo.mint.equals(WSOL_MINT);

  const walletBalance = floor(
    isWrappedSol
      ? Math.max(userData.tokenAccount.balance + userData.nativeSolBalance - FEE_MARGIN, 0)
      : userData.tokenAccount.balance,
    bankInfo.mintDecimals
  );

  const { depositCapacity: depositCapacityBN, borrowCapacity: borrowCapacityBN } = bank.computeRemainingCapacity();
  const depositCapacity = nativeToUi(depositCapacityBN, bankInfo.mintDecimals);
  const borrowCapacity = nativeToUi(borrowCapacityBN, bankInfo.mintDecimals);

  let maxDeposit = floor(Math.max(0, Math.min(walletBalance, depositCapacity)), bankInfo.mintDecimals);

  let maxBorrow = 0;
  if (userData.marginfiAccount) {
    let borrowPower: number;
    if (isUserDataRawProps(userData)) {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(userData.banks, userData.oraclePrices, bank.address, {
          volatilityFactor: VOLATILITY_FACTOR,
        })
        .toNumber();
    } else {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(bank.address, { volatilityFactor: VOLATILITY_FACTOR })
        .toNumber();
    }

    maxBorrow = floor(
      Math.max(0, Math.min(borrowPower, borrowCapacity, bankInfo.availableLiquidity)),
      bankInfo.mintDecimals
    );
  }

  const positionRaw =
    userData.marginfiAccount &&
    userData.marginfiAccount.activeBalances.find((balance) => balance.bankPk.equals(bank.address));
  if (!userData.marginfiAccount || !positionRaw) {
    const userInfo = {
      tokenAccount: userData.tokenAccount,
      maxDeposit,
      maxRepay: 0,
      maxWithdraw: 0,
      maxBorrow,
    };

    return {
      address: bank.address,
      meta,
      info: state,
      userInfo,
      isActive: false,
    };
  }

  // Calculate user-specific info relevant to their active position in this bank

  // const marginfiAccount = userData.marginfiAccount as MarginfiAccountWrapper;

  let props:
    | Pick<MakeLendingPositionRawProps, "marginfiAccount" | "banks" | "oraclePrices">
    | Pick<MakeLendingPositionWrappedProps, "marginfiAccount">;

  if (isUserDataRawProps(userData)) {
    props = {
      marginfiAccount: userData.marginfiAccount,
      banks: userData.banks,
      oraclePrices: userData.oraclePrices,
    };
  } else {
    props = {
      marginfiAccount: userData.marginfiAccount,
    };
  }
  const position = makeLendingPosition({ balance: positionRaw, bank, bankInfo, oraclePrice, ...props });
  let withdrawPower: number;
  if (isUserDataRawProps(userData)) {
    withdrawPower = userData.marginfiAccount
      .computeMaxWithdrawForBank(userData.banks, userData.oraclePrices, bank.address, {
        volatilityFactor: VOLATILITY_FACTOR,
      })
      .toNumber();
  } else {
    withdrawPower = userData.marginfiAccount
      .computeMaxWithdrawForBank(bank.address, {
        volatilityFactor: VOLATILITY_FACTOR,
      })
      .toNumber();
  }
  const maxWithdraw = floor(Math.min(withdrawPower, bankInfo.availableLiquidity), bankInfo.mintDecimals);

  let maxRepay = 0;
  if (position) {
    const debtAmount = ceil(position.amount, bankInfo.mintDecimals);
    maxRepay = Math.min(debtAmount, walletBalance);
  }

  const userInfo = {
    tokenAccount: userData.tokenAccount,
    maxDeposit,
    maxRepay,
    maxWithdraw,
    maxBorrow,
  };

  return {
    address: bank.address,
    meta,
    info: state,
    userInfo,
    isActive: true,
    position,
  };
}

function makeLendingPosition(props: MakeLendingPositionProps): LendingPosition {
  const { balance, bank, bankInfo, oraclePrice, marginfiAccount } = props;
  const amounts = balance.computeQuantity(bank);
  const usdValues = balance.computeUsdValue(bank, oraclePrice, MarginRequirementType.Equity);
  const weightedUSDValues = balance.getUsdValueWithPriceBias(bank, oraclePrice, MarginRequirementType.Maintenance);

  // default to checking against usdValues to account for active positions with zero asset / liab shares
  // if token has been sunset and oracle set to 0 check against shares instead
  const isLending = oraclePrice.priceRealtime.price.isZero()
    ? balance.assetShares.gt(balance.liabilityShares)
    : usdValues.liabilities.isZero();

  const amount = isLending
    ? nativeToUi(amounts.assets.integerValue(BigNumber.ROUND_DOWN).toNumber(), bankInfo.mintDecimals)
    : nativeToUi(amounts.liabilities.integerValue(BigNumber.ROUND_UP).toNumber(), bankInfo.mintDecimals);
  const isDust = uiToNative(amount, bankInfo.mintDecimals).isZero();
  const weightedUSDValue = isLending ? weightedUSDValues.assets.toNumber() : weightedUSDValues.liabilities.toNumber();
  const usdValue = isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber();

  let liquidationPrice: number | null = null;
  if (marginfiAccount instanceof MarginfiAccountWrapper) {
    liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(bank.address);
  } else if ("banks" in props && "oraclePrices" in props) {
    const banks = props.banks;
    const oraclePrices = props.oraclePrices;
    liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(banks, oraclePrices, bank.address);
  }

  return {
    amount,
    usdValue,
    weightedUSDValue,
    liquidationPrice,
    isLending,
    isDust,
  };
}

function groupBanksByEmodeTag(banks: ExtendedBankInfo[]) {
  const groupedBanks: Record<EmodeTag, ExtendedBankInfo[]> = {} as Record<EmodeTag, ExtendedBankInfo[]>;

  for (const bank of banks) {
    const emodeTag = bank.info.rawBank.emode.emodeTag;

    if (!groupedBanks[emodeTag]) {
      groupedBanks[emodeTag] = [];
    }

    // Add the bank to its emodeTag group
    groupedBanks[emodeTag].push(bank);
  }

  return groupedBanks;
}

function getEmodePairs(banks: Bank[]) {
  const emodePairs: EmodePair[] = [];

  banks.forEach((bank) => {
    const emodeTag = bank.emode.emodeTag;

    if (emodeTag === EmodeTag.UNSET) {
      return;
    }

    bank.emode.emodeEntries.forEach((emodeEntry) => {
      emodePairs.push({
        collateralBankTag: emodeEntry.collateralBankEmodeTag,
        liabilityBank: bank.address,
        liabilityBankTag: emodeTag,
        assetWeightMaint: emodeEntry.assetWeightMaint.toNumber(),
        assetWeightInt: emodeEntry.assetWeightInit.toNumber(),
      });
    });
  });

  return emodePairs;
}

/*
TODO: leverage env vars for all staging/production paths
*/
async function fetchStateMetaData(marginfiConfig: MarginfiConfig) {
  let bankMetadataMap: { [address: string]: BankMetadata };
  let tokenMetadataMap: { [symbol: string]: TokenMetadata };

  if (marginfiConfig.environment === "production") {
    let results = await Promise.all([
      loadBankMetadatas(process.env.NEXT_PUBLIC_BANKS_MAP),
      loadTokenMetadatas(process.env.NEXT_PUBLIC_TOKENS_MAP),
    ]);
    bankMetadataMap = results[0];
    tokenMetadataMap = results[1];
  } else if (marginfiConfig.environment === "staging") {
    if (process.env.NEXT_PUBLIC_BANKS_MAP && process.env.NEXT_PUBLIC_TOKENS_MAP) {
      let results = await Promise.all([
        loadBankMetadatas(process.env.NEXT_PUBLIC_BANKS_MAP),
        loadTokenMetadatas(process.env.NEXT_PUBLIC_TOKENS_MAP),
      ]);
      bankMetadataMap = results[0];
      tokenMetadataMap = results[1];
    } else {
      bankMetadataMap = stagingStaticBankMetadata;
      tokenMetadataMap = stagingStaticTokenMetadata;
    }
  } else {
    throw new Error("Unknown environment");
  }

  // fetch staked asset metadata
  const stakedAssetBankMetadataMap = await loadStakedBankMetadatas(
    `${process.env.NEXT_PUBLIC_STAKING_BANKS || "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json"}?t=${new Date().getTime()}`
  );
  const stakedAssetTokenMetadataMap = await loadTokenMetadatas(
    `${process.env.NEXT_PUBLIC_STAKING_TOKENS || "https://storage.googleapis.com/mrgn-public/mrgn-staked-token-metadata-cache.json"}?t=${new Date().getTime()}`
  );

  // merge staked asset metadata with main group metadata
  bankMetadataMap = {
    ...bankMetadataMap,
    ...stakedAssetBankMetadataMap,
  };
  tokenMetadataMap = {
    ...tokenMetadataMap,
    ...stakedAssetTokenMetadataMap,
  };

  return {
    bankMetadataMap,
    tokenMetadataMap,
  };
}

export {
  makeBankInfo,
  makeExtendedBankMetadata,
  makeExtendedBankInfo,
  makeLendingPosition,
  makeEmissionsPriceMap,
  makeExtendedBankEmission,
  groupBanksByEmodeTag,
  fetchStateMetaData,
  getEmodePairs,
};

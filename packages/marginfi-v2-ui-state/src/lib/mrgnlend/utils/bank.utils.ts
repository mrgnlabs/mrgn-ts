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
  AssetTag,
  MarginfiAccount,
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

function makeBankInfo(
  bank: Bank,
  oraclePrice: OraclePrice,
  emissionTokenData?: TokenPrice,
  originalWeights?: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }
): BankState {
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
    originalWeights: originalWeights ?? {
      assetWeightMaint: bank.config.assetWeightMaint,
      assetWeightInit: bank.config.assetWeightInit,
    },
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
  stakePoolMetadata?: StakePoolMetadata,
  originalWeights?: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber },
  availableEmodePairByBorrowBank?: Record<string, EmodePair>
): ExtendedBankInfo {
  function isUserDataRawProps(userData: UserDataWrappedProps | UserDataRawProps): userData is UserDataRawProps {
    return (
      (userData as UserDataRawProps).banks !== undefined && (userData as UserDataRawProps).oraclePrices !== undefined
    );
  }

  if (bank.tokenSymbol === "USDC") {
    console.log("USDC", bank);
    console.log("availableEmodePairByBorrowBank", availableEmodePairByBorrowBank?.[bank.address.toBase58()]);
  }

  // Aggregate user-agnostic bank info
  const meta = makeExtendedBankMetadata(bank, tokenMetadata, overrideIcon, stakePoolMetadata);
  const bankInfo = makeBankInfo(bank, oraclePrice, emissionTokenPrice, originalWeights);
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

  const availableEmodePair = availableEmodePairByBorrowBank?.[bank.address.toBase58()];

  let maxBorrow = 0;
  if (userData.marginfiAccount) {
    let borrowPower: number;
    if (isUserDataRawProps(userData)) {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(userData.banks, userData.oraclePrices, bank.address, {
          volatilityFactor: VOLATILITY_FACTOR,
          emodeWeights: availableEmodePair
            ? {
                assetWeightMaint: availableEmodePair.assetWeightMaint,
                assetWeightInit: availableEmodePair.assetWeightInt,
                collateralTag: availableEmodePair.collateralBankTag,
              }
            : undefined,
        })
        .toNumber();
    } else {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(bank.address, {
          volatilityFactor: VOLATILITY_FACTOR,
          emodeWeights: availableEmodePair
            ? {
                assetWeightMaint: availableEmodePair.assetWeightMaint,
                assetWeightInit: availableEmodePair.assetWeightInt,
                collateralTag: availableEmodePair.collateralBankTag,
              }
            : undefined,
        })
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
  const position = makeLendingPosition({
    balance: positionRaw,
    bank,
    bankInfo,
    oraclePrice,
    emodeActive: !!originalWeights,
    ...props,
  });
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
    emodeActive: props.emodeActive,
  };
}
function groupRawBankByEmodeTag(banks: Bank[]) {
  const groupedBanks: Record<EmodeTag, Bank[]> = {} as Record<EmodeTag, Bank[]>;

  for (const bank of banks) {
    const emodeTag = bank.emode.emodeTag;

    if (!groupedBanks[emodeTag]) {
      groupedBanks[emodeTag] = [];
    }

    // Add the bank to its emodeTag group
    groupedBanks[emodeTag].push(bank);
  }

  return groupedBanks;
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

function groupLiabilityBanksByCollateralBank(banks: ExtendedBankInfo[], emodePairs: EmodePair[]) {
  const bankMap = new Map<string, ExtendedBankInfo>();
  banks.forEach((bank) => {
    bankMap.set(bank.info.rawBank.address.toString(), bank);
  });

  const result: Record<string, { liabilityBank: ExtendedBankInfo; emodePair: EmodePair }[]> = {};

  emodePairs.forEach((emodePair) => {
    const liabilityBankKey = emodePair.liabilityBank.toString();

    const liabilityBank = bankMap.get(liabilityBankKey);

    if (!liabilityBank) {
      console.error(`Liability bank ${liabilityBankKey} referenced in emode pair not found in banks array`);
      return;
    }

    banks.forEach((potentialCollateralBank) => {
      const bankRaw = potentialCollateralBank.info.rawBank;
      const collateralBankKey = bankRaw.address.toString();

      if (bankRaw.address.equals(emodePair.liabilityBank)) {
        return;
      }

      if (potentialCollateralBank.info.state.hasEmode && bankRaw.emode.emodeTag === emodePair.collateralBankTag) {
        if (!result[collateralBankKey]) {
          result[collateralBankKey] = [];
        }

        result[collateralBankKey].push({
          liabilityBank: liabilityBank,
          emodePair,
        });
      }
    });
  });

  return result;
}

function groupCollateralBanksByLiabilityBank(banks: ExtendedBankInfo[], emodePairs: EmodePair[]) {
  // Create a map of bank PublicKey string to the ExtendedBankInfo
  const bankMap = new Map<string, ExtendedBankInfo>();
  banks.forEach((bank) => {
    bankMap.set(bank.info.rawBank.address.toString(), bank);
  });

  const result: Record<string, { collateralBank: ExtendedBankInfo; emodePair: EmodePair }[]> = {};

  emodePairs.forEach((emodePair) => {
    const liabilityBankKey = emodePair.liabilityBank.toString();

    banks.forEach((potentialCollateralBank) => {
      const bankRaw = potentialCollateralBank.info.rawBank;
      if (bankRaw.address.equals(emodePair.liabilityBank)) {
        return;
      }

      if (potentialCollateralBank.info.state.hasEmode && bankRaw.emode.emodeTag === emodePair.collateralBankTag) {
        if (!result[liabilityBankKey]) {
          result[liabilityBankKey] = [];
        }

        result[liabilityBankKey].push({
          collateralBank: potentialCollateralBank,
          emodePair,
        });
      }
    });

    if (!bankMap.has(liabilityBankKey)) {
      console.error(`Liability bank ${liabilityBankKey} referenced in emode pair not found in banks array`);
    }
  });

  return result;
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
        collateralBanks: banks
          .filter((bank) => bank.emode.emodeTag === emodeEntry.collateralBankEmodeTag)
          .map((bank) => bank.address),
        collateralBankTag: emodeEntry.collateralBankEmodeTag,
        liabilityBank: bank.address,
        liabilityBankTag: emodeTag,
        assetWeightMaint: emodeEntry.assetWeightMaint,
        assetWeightInt: emodeEntry.assetWeightInit,
      });
    });
  });

  return emodePairs;
}

function adjustBankWeightsWithEmodePairs(
  banks: Bank[],
  emodePairs: EmodePair[]
): {
  adjustedBanks: Bank[];
  originalWeights: Record<string, { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }>;
} {
  if (!emodePairs.length) return { adjustedBanks: banks, originalWeights: {} };

  const originalWeights: Record<string, { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }> = {};

  const lowestWeights: Map<string, { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }> = new Map();

  // For each emode pair, find the collateral banks and track their lowest possible weights
  emodePairs.forEach((emodePair) => {
    emodePair.collateralBanks.forEach((collateralBankPk) => {
      const bankPkStr = collateralBankPk.toString();

      // If we haven't seen this bank yet, initialize with current emode pair weights
      if (!lowestWeights.has(bankPkStr)) {
        lowestWeights.set(bankPkStr, {
          assetWeightMaint: emodePair.assetWeightMaint,
          assetWeightInit: emodePair.assetWeightInt,
        });
      } else {
        // If we've seen this bank before, use the lower weights
        const currentLowest = lowestWeights.get(bankPkStr)!;
        lowestWeights.set(bankPkStr, {
          assetWeightMaint: BigNumber.min(currentLowest.assetWeightMaint, emodePair.assetWeightMaint),
          assetWeightInit: BigNumber.min(currentLowest.assetWeightInit, emodePair.assetWeightInt),
        });
      }
    });
  });

  // Make a copy of the banks array to avoid modifying the original array reference
  // but keep the original Bank objects (with their methods intact)
  const adjustedBanks = [...banks];

  // Apply the lowest weights to each bank
  for (const bank of adjustedBanks) {
    const bankPkStr = bank.address.toString();
    const lowestWeight = lowestWeights.get(bankPkStr);

    if (lowestWeight) {
      // Store original weights before modifying
      originalWeights[bankPkStr] = {
        assetWeightMaint: bank.config.assetWeightMaint,
        assetWeightInit: bank.config.assetWeightInit,
      };

      // Apply new weights only if they're higher than current weights
      if (lowestWeight.assetWeightMaint.gt(bank.config.assetWeightMaint)) {
        // Use the emode weight directly since it's already a BigNumber
        bank.config.assetWeightMaint = lowestWeight.assetWeightMaint;
      }

      if (lowestWeight.assetWeightInit.gt(bank.config.assetWeightInit)) {
        // Use the emode weight directly since it's already a BigNumber
        bank.config.assetWeightInit = lowestWeight.assetWeightInit;
      }
    }
  }

  return { adjustedBanks, originalWeights };
}
/**
 * Collects all possible borrow banks that would enable or continue active emodes for the user
 * @param marginfiAccount The user's marginfi account wrapper
 * @param emodePairs All available emode pairs
 * @param activeEmodePairs Currently active emode pairs (optional)
 * @returns A map of bank publickeys to their corresponding emode pairs
 */
function getPossibleBorrowBanksForEmodes(
  emodePairs: EmodePair[],
  marginfiAccount?: MarginfiAccountWrapper | MarginfiAccount | null,
  activeEmodePairs?: EmodePair[]
) {
  // Is emode active right now?
  const pairByLiabilityBank: Record<string, EmodePair> = {};

  if (!marginfiAccount) {
    return pairByLiabilityBank;
  }

  if (!activeEmodePairs || !activeEmodePairs.length) {
    // Is there a borrow
    if (marginfiAccount.activeBalances.some((b) => b.liabilityShares.gt(0))) {
      return pairByLiabilityBank;
    } else {
      // Create a lookup map of bank public keys (base58) to quickly check collateral banks
      const depositBankPkStrings = new Set(
        marginfiAccount.activeBalances
          .filter((balance) => balance.assetShares.gt(0))
          .map((balance) => balance.bankPk.toBase58())
      );

      // Single pass through emodePairs
      emodePairs.forEach((pair) => {
        // Check if any of the collateral banks match the user's deposits
        const hasMatchingCollateral = pair.collateralBanks.some((collateralBankPk) =>
          depositBankPkStrings.has(collateralBankPk.toBase58())
        );

        if (hasMatchingCollateral) {
          const liabilityBankKey = pair.liabilityBank.toBase58();
          if (
            !pairByLiabilityBank[liabilityBankKey] ||
            pair.assetWeightMaint.lt(pairByLiabilityBank[liabilityBankKey].assetWeightMaint)
          ) {
            pairByLiabilityBank[liabilityBankKey] = pair;
          }
        }
      });
    }
  } else {
    const allPairsByLiabilityBank: Record<string, EmodePair[]> = {};
    const mandatoryCollateralTags = new Set<EmodeTag>(activeEmodePairs.map((pair) => pair.collateralBankTag));

    emodePairs.forEach((pair) => {
      const liabilityBankKey = pair.liabilityBank.toBase58();
      if (!allPairsByLiabilityBank[liabilityBankKey]) {
        allPairsByLiabilityBank[liabilityBankKey] = [pair];
      } else {
        allPairsByLiabilityBank[liabilityBankKey].push(pair);
      }
    });

    Object.values(allPairsByLiabilityBank).forEach((pairs) => {
      let allPresent = true;

      mandatoryCollateralTags.forEach((tag) => {
        if (!pairs.some((pair) => pair.collateralBankTag === tag)) {
          allPresent = false;
        }
      });

      if (allPresent) {
        const filteredPairs = pairs.filter((pair) => mandatoryCollateralTags.has(pair.collateralBankTag));

        filteredPairs.forEach((finalPair) => {
          const liabilityBankKey = finalPair.liabilityBank.toBase58();
          if (
            !pairByLiabilityBank[liabilityBankKey] ||
            finalPair.assetWeightMaint.lt(pairByLiabilityBank[liabilityBankKey].assetWeightMaint)
          ) {
            pairByLiabilityBank[liabilityBankKey] = finalPair;
          }
        });
      }
    });
  }

  return pairByLiabilityBank;
}

function getUserActiveEmodes(
  selectedAccount: MarginfiAccountWrapper,
  emodePairs: EmodePair[],
  banksByEmodeTag: Record<EmodeTag, Bank[]>
) {
  if (!selectedAccount) return [];

  const activeBalances = selectedAccount.activeBalances;

  // check all borrows have emode pairs
  const allBorrows = activeBalances.filter((balance) => balance.liabilityShares.gt(0));

  const allBorrowsHaveEmode = allBorrows.every((balance) => {
    const bankWithEmode = Object.entries(banksByEmodeTag).find(([_, banks]) =>
      banks.some((bank) => bank.address.equals(balance.bankPk))
    );

    // If bank is found in an emode group, check if it has a corresponding emode pair
    return bankWithEmode ? emodePairs.some((pair) => pair.liabilityBank.equals(balance.bankPk)) : false;
  });

  if (!allBorrowsHaveEmode) return [];

  // Get deposits (assets) and their corresponding emode tags
  const deposits = activeBalances
    .filter((balance) => balance.assetShares.gt(0))
    .map((balance) => {
      // Find the bank for this balance to get its emode tag
      const bank = Object.values(banksByEmodeTag)
        .flat()
        .find((bank) => bank.address.equals(balance.bankPk));

      return {
        bankPk: balance.bankPk,
        emodeTag: bank?.emode.emodeTag,
      };
    })
    .filter((deposit) => deposit.emodeTag);

  // Get deposit emode tags
  const depositEmodeTags = new Set(deposits.map((deposit) => deposit.emodeTag));

  // Get borrows (liabilities)
  const borrows = activeBalances
    .filter((balance) => balance.liabilityShares.gt(0))
    .map((balance) => {
      // Find the bank for this balance to get its emode tag
      const bank = Object.values(banksByEmodeTag)
        .flat()
        .find((bank) => bank.address.equals(balance.bankPk));

      return {
        bankPk: balance.bankPk,
        emodeTag: bank?.emode.emodeTag,
      };
    })
    .filter((borrow) => borrow.emodeTag);

  // Get borrow emode tags
  const borrowEmodeTags = new Set(borrows.map((borrow) => borrow.emodeTag));

  if (borrows.length === 0 || deposits.length === 0) return [];
  if (depositEmodeTags.size === 0 || borrowEmodeTags.size === 0) return [];

  // if there aren't any emode tags in the borrow set, return empty array
  if (borrowEmodeTags.has(undefined)) return [];

  // Get potential emode pairs that match user's borrows
  const potentialEmodePairs = emodePairs.filter((pair) =>
    borrows.some((borrow) => borrow.bankPk.equals(pair.liabilityBank))
  );

  // If no potential emode pairs, no emode is active
  if (potentialEmodePairs.length === 0) return [];

  // Filter to only include pairs where the collateral tag matches one of user's deposits
  const matchingEmodePairs = potentialEmodePairs.filter((pair) => depositEmodeTags.has(pair.collateralBankTag));

  // If no matching pairs, return empty array
  if (matchingEmodePairs.length === 0) return [];

  // Make sure all liability assets are present in the matching emode pairs
  let allBorrowsPresent = true;

  borrowEmodeTags.forEach((tag) => {
    if (!matchingEmodePairs.some((pair) => pair.liabilityBankTag === tag)) {
      allBorrowsPresent = false;
    }
  });

  if (!allBorrowsPresent) return [];

  // if there is only one emode pair active, return it
  if (matchingEmodePairs.length === 1) return matchingEmodePairs;

  // if there are multiple emode pairs active
  const matchedLiabilityTags = new Set(matchingEmodePairs.map((pair) => pair.liabilityBankTag));
  const matchedCollateralTags = new Set(matchingEmodePairs.map((pair) => pair.collateralBankTag));

  if (matchedLiabilityTags.size === 1 || matchedCollateralTags.size === 1) {
    return matchingEmodePairs;
  }

  // Check if there's a collateral tag that works for all liability tags
  const compatibleCollateralTags: EmodeTag[] = [];

  matchedCollateralTags.forEach((tag) => {
    const worksForAllLiabilities = Array.from(borrowEmodeTags).every((liabilityTag) =>
      matchingEmodePairs.some((pair) => pair.liabilityBankTag === liabilityTag && pair.collateralBankTag === tag)
    );

    if (worksForAllLiabilities) {
      compatibleCollateralTags.push(tag);
    }
  });

  // If we found compatible collateral tags, return pairs that use them
  if (compatibleCollateralTags.length > 0) {
    return matchingEmodePairs.filter((pair) => compatibleCollateralTags.includes(pair.collateralBankTag));
  }

  console.log({ matchingEmodePairs });

  return [];
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
  groupRawBankByEmodeTag,
  getUserActiveEmodes,
  adjustBankWeightsWithEmodePairs,
  groupCollateralBanksByLiabilityBank,
  groupLiabilityBanksByCollateralBank,
  getPossibleBorrowBanksForEmodes,
};

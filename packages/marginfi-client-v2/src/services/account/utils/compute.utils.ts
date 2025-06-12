import BigNumber from "bignumber.js";
import { PublicKey } from "@solana/web3.js";

import { aprToApy, BankMetadataMap, composeRemainingAccounts, nativeToUi, shortenAddress } from "@mrgnlabs/mrgn-common";

import { BalanceType, MarginfiAccountType } from "../types";
import { MarginRequirementType } from "../../../models/account";
import { OraclePrice } from "../../price";
import { PriceBias } from "../../price/types";
import {
  BankType,
  computeAssetUsdValue,
  computeInterestRates,
  computeLiabilityUsdValue,
  getAssetQuantity,
  getLiabilityQuantity,
} from "../../bank";
import { findPoolAddress, findPoolMintAddress, findPoolStakeAddress } from "../../../vendor";

/**
 * Marginfi Account Computes
 * =========================
 */

export function computeFreeCollateral(marginfiAccount: MarginfiAccountType, opts?: { clamped?: boolean }): BigNumber {
  const _clamped = opts?.clamped ?? true;

  const { assets, liabilities } = computeHealthComponents(marginfiAccount, MarginRequirementType.Initial);

  const signedFreeCollateral = assets.minus(liabilities);

  return _clamped ? BigNumber.max(0, signedFreeCollateral) : signedFreeCollateral;
}

export function computeHealthComponents(
  marginfiAccount: MarginfiAccountType,
  marginReqType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  // check if health cache failed
  switch (marginReqType) {
    case MarginRequirementType.Equity:
      return {
        assets: marginfiAccount.healthCache.assetValueEquity,
        liabilities: marginfiAccount.healthCache.liabilityValueEquity,
      };
    case MarginRequirementType.Initial:
      return {
        assets: marginfiAccount.healthCache.assetValue,
        liabilities: marginfiAccount.healthCache.liabilityValue,
      };
    case MarginRequirementType.Maintenance:
      return {
        assets: marginfiAccount.healthCache.assetValueMaint,
        liabilities: marginfiAccount.healthCache.liabilityValueMaint,
      };
  }
}

export function computeHealthComponentsLegacy(
  activeBalances: BalanceType[],
  banks: Map<string, BankType>,
  oraclePrices: Map<string, OraclePrice>,
  marginReqType: MarginRequirementType,
  excludedBanks: PublicKey[] = []
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const filteredBalances = activeBalances.filter(
    (accountBalance) => !excludedBanks.find((b) => b.equals(accountBalance.bankPk))
  );

  const [assets, liabilities] = filteredBalances
    .map((accountBalance) => {
      const bank = banks.get(accountBalance.bankPk.toBase58());
      if (!bank) {
        console.warn(`Bank ${shortenAddress(accountBalance.bankPk)} not found, excluding from health computation`);
        return [new BigNumber(0), new BigNumber(0)];
      }

      const priceInfo = oraclePrices.get(accountBalance.bankPk.toBase58());
      if (!priceInfo) {
        console.warn(
          `Price info for bank ${shortenAddress(accountBalance.bankPk)} not found, excluding from health computation`
        );
        return [new BigNumber(0), new BigNumber(0)];
      }

      const { assets, liabilities } = getBalanceUsdValueWithPriceBias(accountBalance, bank, priceInfo, marginReqType);
      return [assets, liabilities];
    })
    .reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new BigNumber(0), new BigNumber(0)]
    );

  return { assets, liabilities };
}

export function computeHealthComponentsWithoutBiasLegacy(
  activeBalances: BalanceType[],
  banks: Map<string, BankType>,
  oraclePrices: Map<string, OraclePrice>,
  marginReqType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const [assets, liabilities] = activeBalances
    .map((accountBalance) => {
      const bank = banks.get(accountBalance.bankPk.toBase58());
      if (!bank) {
        console.warn(`Bank ${shortenAddress(accountBalance.bankPk)} not found, excluding from health computation`);
        return [new BigNumber(0), new BigNumber(0)];
      }

      const priceInfo = oraclePrices.get(accountBalance.bankPk.toBase58());
      if (!priceInfo) {
        console.warn(
          `Price info for bank ${shortenAddress(accountBalance.bankPk)} not found, excluding from health computation`
        );
        return [new BigNumber(0), new BigNumber(0)];
      }

      const { assets, liabilities } = computeBalanceUsdValue(accountBalance, bank, priceInfo, marginReqType);
      return [assets, liabilities];
    })
    .reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new BigNumber(0), new BigNumber(0)]
    );

  return { assets, liabilities };
}

export function computeAccountValue(marginfiAccount: MarginfiAccountType): BigNumber {
  const { assets, liabilities } = computeHealthComponents(marginfiAccount, MarginRequirementType.Equity);
  return assets.minus(liabilities);
}

export function computeNetApy(
  marginfiAccount: MarginfiAccountType,
  activeBalances: BalanceType[],
  banks: Map<string, BankType>,
  oraclePrices: Map<string, OraclePrice>
): number {
  const { assets, liabilities } = computeHealthComponents(marginfiAccount, MarginRequirementType.Equity);
  const totalUsdValue = assets.minus(liabilities);
  const apr = activeBalances
    .reduce((weightedApr, balance) => {
      const bank = banks.get(balance.bankPk.toBase58());
      if (!bank) {
        console.warn(`Bank ${shortenAddress(balance.bankPk)} not found, excluding from APY computation`);
        return weightedApr;
      }

      const priceInfo = oraclePrices.get(balance.bankPk.toBase58());
      if (!priceInfo) {
        console.warn(`Price info for bank ${shortenAddress(balance.bankPk)} not found, excluding from APY computation`);
        return weightedApr;
      }

      return weightedApr
        .minus(
          computeInterestRates(bank)
            .borrowingRate.times(
              computeBalanceUsdValue(balance, bank, priceInfo, MarginRequirementType.Equity).liabilities
            )
            .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
        )
        .plus(
          computeInterestRates(bank)
            .lendingRate.times(computeBalanceUsdValue(balance, bank, priceInfo, MarginRequirementType.Equity).assets)
            .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
        );
    }, new BigNumber(0))
    .toNumber();

  return aprToApy(apr);
}

/**
 * Marginfi Balance Computes
 * =========================
 */

export function computeBalanceUsdValue(
  balance: BalanceType,
  bank: BankType,
  oraclePrice: OraclePrice,
  marginRequirementType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const assetsValue = computeAssetUsdValue(
    bank,
    oraclePrice,
    balance.assetShares,
    marginRequirementType,
    PriceBias.None
  );
  const liabilitiesValue = computeLiabilityUsdValue(
    bank,
    oraclePrice,
    balance.liabilityShares,
    marginRequirementType,
    PriceBias.None
  );
  return { assets: assetsValue, liabilities: liabilitiesValue };
}

export function getBalanceUsdValueWithPriceBias(
  balance: BalanceType,
  bank: BankType,
  oraclePrice: OraclePrice,
  marginRequirementType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const assetsValue = computeAssetUsdValue(
    bank,
    oraclePrice,
    balance.assetShares,
    marginRequirementType,
    PriceBias.Lowest
  );
  const liabilitiesValue = computeLiabilityUsdValue(
    bank,
    oraclePrice,
    balance.liabilityShares,
    marginRequirementType,
    PriceBias.Highest
  );
  return { assets: assetsValue, liabilities: liabilitiesValue };
}

export function computeQuantity(
  balance: BalanceType,
  bank: BankType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const assetsQuantity = getAssetQuantity(bank, balance.assetShares);
  const liabilitiesQuantity = getLiabilityQuantity(bank, balance.liabilityShares);
  return { assets: assetsQuantity, liabilities: liabilitiesQuantity };
}

export function computeQuantityUi(
  balance: BalanceType,
  bank: BankType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const assetsQuantity = new BigNumber(nativeToUi(getAssetQuantity(bank, balance.assetShares), bank.mintDecimals));
  const liabilitiesQuantity = new BigNumber(
    nativeToUi(getLiabilityQuantity(bank, balance.liabilityShares), bank.mintDecimals)
  );
  return { assets: assetsQuantity, liabilities: liabilitiesQuantity };
}

export function computeClaimedEmissions(balance: BalanceType, bank: BankType, currentTimestamp: number): BigNumber {
  const lendingActive = bank.emissionsActiveLending;
  const borrowActive = bank.emissionsActiveBorrowing;

  const { assets, liabilities } = computeQuantity(balance, bank);

  let balanceAmount: BigNumber | null = null;

  if (lendingActive) {
    balanceAmount = assets;
  } else if (borrowActive) {
    balanceAmount = liabilities;
  }

  if (balanceAmount) {
    const lastUpdate = balance.lastUpdate;
    const period = new BigNumber(currentTimestamp - lastUpdate);
    const emissionsRate = new BigNumber(bank.emissionsRate);
    const emissions = period
      .times(balanceAmount)
      .times(emissionsRate)
      .div(31_536_000 * Math.pow(10, bank.mintDecimals));
    const emissionsReal = BigNumber.min(emissions, new BigNumber(bank.emissionsRemaining));

    return emissionsReal;
  }

  return new BigNumber(0);
}

export function computeTotalOutstandingEmissions(balance: BalanceType, bank: BankType): BigNumber {
  const claimedEmissions = balance.emissionsOutstanding;
  const unclaimedEmissions = computeClaimedEmissions(balance, bank, Date.now() / 1000);
  return claimedEmissions.plus(unclaimedEmissions);
}

export function computeHealthCheckAccounts(
  balances: BalanceType[],
  banks: Map<string, BankType>,
  mandatoryBanks: PublicKey[] = [],
  excludedBanks: PublicKey[] = []
): BankType[] {
  const activeBalances = balances.filter((b) => b.active);

  const mandatoryBanksSet = new Set(mandatoryBanks.map((b) => b.toBase58()));
  const excludedBanksSet = new Set(excludedBanks.map((b) => b.toBase58()));
  const activeBanks = new Set(activeBalances.map((b) => b.bankPk.toBase58()));
  const banksToAdd = new Set([...mandatoryBanksSet].filter((x) => !activeBanks.has(x)));

  let slotsToKeep = banksToAdd.size;
  const projectedActiveBanks = balances
    .filter((balance) => {
      if (balance.active) {
        return !excludedBanksSet.has(balance.bankPk.toBase58());
      } else if (slotsToKeep > 0) {
        slotsToKeep--;
        return true;
      } else {
        return false;
      }
    })
    .map((balance) => {
      if (balance.active) {
        const bank = banks.get(balance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${balance.bankPk.toBase58()} not found`);
        return bank;
      }
      const newBankAddress = [...banksToAdd.values()][0];
      banksToAdd.delete(newBankAddress);
      const bank = banks.get(newBankAddress);
      if (!bank) throw Error(`Bank ${newBankAddress} not found`);
      return bank;
    });

  return projectedActiveBanks;
}

export function computeHealthAccountMetas(
  banksToInclude: BankType[],
  bankMetadataMap?: BankMetadataMap,
  enableSorting = true
): PublicKey[] {
  let wrapperFn = enableSorting ? composeRemainingAccounts : (banksAndOracles: PublicKey[][]) => banksAndOracles.flat();

  const accounts = wrapperFn(
    banksToInclude.map((bank) => {
      const keys = [bank.address, bank.oracleKey];

      // for staked collateral banks (assetTag === 2), include additional accounts
      if (bank.config.assetTag === 2) {
        const bankMetadata = bankMetadataMap?.[bank.address.toBase58()];

        if (!bankMetadata || !bankMetadata.validatorVoteAccount) {
          throw Error(`Bank metadata for ${bank.address.toBase58()} not found`);
        }

        const pool = findPoolAddress(new PublicKey(bankMetadata.validatorVoteAccount));
        const solPool = findPoolStakeAddress(pool);
        const lstMint = findPoolMintAddress(pool);

        keys.push(lstMint, solPool);
      }

      return keys;
    })
  );

  return accounts;
}

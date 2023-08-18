import BigNumber from "bignumber.js";
import { Balance, Bank, MarginRequirementType, PriceBias } from "../..";
import { aprToApy, shortenAddress } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

export function computeFreeCollateral(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  opts?: { clamped?: boolean }
): BigNumber {
  const _clamped = opts?.clamped ?? true;

  const { assets, liabilities } = computeHealthComponents(activeBalances, banks, MarginRequirementType.Init);
  const signedFreeCollateral = assets.minus(liabilities);

  return _clamped ? BigNumber.max(0, signedFreeCollateral) : signedFreeCollateral;
}

export function computeHealthComponents(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  marginReqType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const [assets, liabilities] = activeBalances
    .map((accountBalance) => {
      const bank = banks.get(accountBalance.bankPk.toBase58());
      if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);
      const { assets, liabilities } = accountBalance.getUsdValueWithPriceBias(bank, marginReqType);
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

export function computeHealthComponentsWithoutBias(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  marginReqType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const [assets, liabilities] = activeBalances
    .map((accountBalance) => {
      const bank = banks.get(accountBalance.bankPk.toBase58());
      if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);
      const { assets, liabilities } = accountBalance.getUsdValue(bank, marginReqType);
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

export function computeNetApy(activeBalances: Balance[], banks: Map<string, Bank>): number {
  const { assets, liabilities } = computeHealthComponentsWithoutBias(
    activeBalances,
    banks,
    MarginRequirementType.Equity
  );
  const totalUsdValue = assets.minus(liabilities);
  const apr = activeBalances
    .reduce((weightedApr, balance) => {
      const bank = banks.get(balance.bankPk.toBase58());
      if (!bank) throw Error(`Bank ${balance.bankPk.toBase58()} not found`);
      return weightedApr
        .minus(
          bank
            .getInterestRates()
            .borrowingRate.times(balance.getUsdValue(bank, MarginRequirementType.Equity).liabilities)
            .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
        )
        .plus(
          bank
            .getInterestRates()
            .lendingRate.times(balance.getUsdValue(bank, MarginRequirementType.Equity).assets)
            .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
        );
    }, new BigNumber(0))
    .toNumber();

  return aprToApy(apr);
}

/**
 * Calculate the maximum amount of asset that can be withdrawn from a bank given existing deposits of the asset
 * and the untied collateral of the margin account.
 *
 * fc = free collateral
 * ucb = untied collateral for bank
 *
 * q = (min(fc, ucb) / (price_lowest_bias * deposit_weight)) + (fc - min(fc, ucb)) / (price_highest_bias * liab_weight)
 *
 *
 *
 * NOTE FOR LIQUIDATORS
 * This function doesn't take into account the collateral received when liquidating an account.
 */
export function computeMaxBorrowForBank(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  bankAddress: PublicKey
): BigNumber {
  const bank = banks.get(bankAddress.toBase58());
  if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

  const balance = getBalance(activeBalances, bankAddress);

  const freeCollateral = computeFreeCollateral(activeBalances, banks);
  const untiedCollateralForBank = BigNumber.min(
    bank.getAssetUsdValue(balance.assetShares, MarginRequirementType.Init, PriceBias.Lowest),
    freeCollateral
  );

  const priceLowestBias = bank.getPrice(PriceBias.Lowest);
  const priceHighestBias = bank.getPrice(PriceBias.Highest);
  const assetWeight = bank.getAssetWeight(MarginRequirementType.Init);
  const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Init);

  if (assetWeight.eq(0)) {
    return balance
      .getQuantityUi(bank)
      .assets.plus(freeCollateral.minus(untiedCollateralForBank).div(priceHighestBias.times(liabWeight)));
  } else {
    return untiedCollateralForBank
      .div(priceLowestBias.times(assetWeight))
      .plus(freeCollateral.minus(untiedCollateralForBank).div(priceHighestBias.times(liabWeight)));
  }
}

/**
 * Calculate the maximum amount that can be withdrawn form a bank without borrowing.
 */
export function computeMaxWithdrawForBank(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  bankAddress: PublicKey,
  opts?: { volatilityFactor?: number }
): BigNumber {
  const bank = banks.get(bankAddress.toBase58());
  if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

  const _volatilityFactor = opts?.volatilityFactor ?? 1;

  const assetWeight = bank.getAssetWeight(MarginRequirementType.Init);
  const balance = getBalance(activeBalances, bankAddress);

  if (assetWeight.eq(0)) {
    return balance.getQuantityUi(bank).assets;
  } else {
    const freeCollateral = computeFreeCollateral(activeBalances, banks);
    const collateralForBank = bank.getAssetUsdValue(balance.assetShares, MarginRequirementType.Init, PriceBias.Lowest);
    let untiedCollateralForBank: BigNumber;
    if (collateralForBank.lte(freeCollateral)) {
      untiedCollateralForBank = collateralForBank;
    } else {
      untiedCollateralForBank = freeCollateral.times(_volatilityFactor);
    }

    const priceLowestBias = bank.getPrice(PriceBias.Lowest);

    return untiedCollateralForBank.div(priceLowestBias.times(assetWeight));
  }
}

// Calculate the max amount of collateral to liquidate to bring an account maint health to 0 (assuming negative health).
//
// The asset amount is bounded by 2 constraints,
// (1) the amount of liquidated collateral cannot be more than the balance,
// (2) the amount of covered liablity cannot be more than existing liablity.
export function computeMaxLiquidatableAssetAmount(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  assetBankAddress: PublicKey,
  liabilityBankAddress: PublicKey
): BigNumber {
  const debug = require("debug")("mfi:getMaxLiquidatableAssetAmount");
  const assetBank = banks.get(assetBankAddress.toBase58());
  if (!assetBank) throw Error(`Bank ${assetBankAddress.toBase58()} not found`);
  const liabilityBank = banks.get(liabilityBankAddress.toBase58());
  if (!liabilityBank) throw Error(`Bank ${liabilityBankAddress.toBase58()} not found`);

  const { assets, liabilities } = computeHealthComponents(activeBalances, banks, MarginRequirementType.Maint);
  const currentHealth = assets.minus(liabilities);

  const priceAssetLower = assetBank.getPrice(PriceBias.Lowest);
  const priceAssetMarket = assetBank.getPrice(PriceBias.None);
  const assetMaintWeight = assetBank.config.assetWeightMaint;

  const liquidationDiscount = new BigNumber(1 - 0.05);

  const priceLiabHighest = liabilityBank.getPrice(PriceBias.Highest);
  const priceLiabMarket = liabilityBank.getPrice(PriceBias.None);
  const liabMaintWeight = liabilityBank.config.liabilityWeightMaint;

  // MAX amount of asset to liquidate to bring account maint health to 0, regardless of existing balances
  const underwaterMaintValue = currentHealth.div(
    priceAssetLower
      .times(assetMaintWeight)
      .minus(
        priceAssetMarket.times(liquidationDiscount).times(priceLiabHighest).times(liabMaintWeight).div(priceLiabMarket)
      )
  );

  // MAX asset amount bounded by available asset amount
  const assetsCap = getBalance(activeBalances, assetBank.publicKey).getQuantityUi(assetBank).assets;

  // MAX asset amount bounded by available liability amount
  const liabilitiesForBank = getBalance(activeBalances, assetBank.publicKey).getQuantityUi(assetBank).liabilities;
  const liabilityCap = liabilitiesForBank.times(priceLiabMarket).div(priceAssetMarket.times(liquidationDiscount));

  debug("underwaterValue", underwaterMaintValue.toFixed(6));
  debug("assetsCap", assetsCap.toFixed(6));
  debug("liabilityCap", liabilityCap.toFixed(6));

  return BigNumber.min(assetsCap, liabilityCap, underwaterMaintValue);
}

export function getBalance(activeBalances: Balance[], bankPk: PublicKey): Balance {
  return activeBalances.find((b) => b.bankPk.equals(bankPk)) ?? Balance.newEmpty(bankPk);
}

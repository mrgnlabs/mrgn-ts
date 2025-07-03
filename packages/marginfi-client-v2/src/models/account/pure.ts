import {
  Amount,
  BankMetadataMap,
  InstructionsWrapper,
  NATIVE_MINT,
  Program,
  TOKEN_2022_PROGRAM_ID,
  aprToApy,
  bigNumberToWrappedI80F48,
  composeRemainingAccounts,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  shortenAddress,
  uiToNative,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";
import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Bank } from "../bank";
import instructions from "../../instructions";
import { MarginfiProgram } from "../../types";
import { makeWrapSolIxs, makeUnwrapSolIx, feedIdToString } from "../../utils";
import { Balance } from "../balance";
import {
  BankMap,
  MarginfiClient,
  MarginfiIdlType,
  OraclePriceMap,
  RiskTier,
  MintData,
  MarginfiAccountRaw,
  MarginfiAccountType,
  AccountFlags,
  EmodeTag,
  EmodePair,
  computeEmodeImpacts,
  computeActiveEmodePairs,
  ActionEmodeImpact,
  computeHealthComponents,
  computeFreeCollateral,
  OraclePrice,
  getPrice,
  decodeAccountRaw,
  parseMarginfiAccountRaw,
  computeHealthComponentsLegacy,
  computeHealthComponentsWithoutBiasLegacy,
  computeAccountValue,
  computeNetApy,
  OracleSetup,
  createUpdateFeedIx,
  crankPythOracleIx,
  simulateAccountHealthCache,
  simulateAccountHealthCacheWithFallback,
  computeHealthAccountMetas,
  BankType,
  computeHealthCheckAccounts,
  makePulseHealthIx,
  computeFreeCollateralLegacy,
  EmodeImpactStatus,
} from "../..";
import BN from "bn.js";
import { BorshInstructionCoder } from "@coral-xyz/anchor";
import { findPoolMintAddress, findPoolAddress, findPoolStakeAddress } from "../../vendor/single-spl-pool";
import { HealthCache } from "../health-cache";
import { PriceBias } from "../../services/price/types";
import { simulateBundle } from "../../services/transaction/helpers";

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class MarginfiAccount implements MarginfiAccountType {
  constructor(
    public readonly address: PublicKey,
    public readonly group: PublicKey,
    public readonly authority: PublicKey,
    public readonly balances: Balance[],
    public readonly accountFlags: AccountFlags[],
    public readonly emissionsDestinationAccount: PublicKey,
    public healthCache: HealthCache
  ) {}

  static async fetch(address: PublicKey, client: MarginfiClient): Promise<MarginfiAccount> {
    const data: MarginfiAccountRaw = await client.program.account.marginfiAccount.fetch(address);
    return MarginfiAccount.fromAccountParsed(address, data);
  }

  /**
   * @deprecated use decodeAccountRaw instead
   */
  static decode(encoded: Buffer, idl: MarginfiIdlType): MarginfiAccountRaw {
    return decodeAccountRaw(encoded, idl);
  }

  static decodeAccountRaw(encoded: Buffer, idl: MarginfiIdlType): MarginfiAccountRaw {
    return decodeAccountRaw(encoded, idl);
  }

  static fromAccountType(account: MarginfiAccountType) {
    return new MarginfiAccount(
      account.address,
      account.group,
      account.authority,
      account.balances.map((b) => Balance.fromBalanceType(b)),
      account.accountFlags,
      account.emissionsDestinationAccount,
      account.healthCache
    );
  }

  static fromAccountParsed(marginfiAccountPk: PublicKey, accountData: MarginfiAccountRaw) {
    const props = parseMarginfiAccountRaw(marginfiAccountPk, accountData);
    return new MarginfiAccount(
      props.address,
      props.group,
      props.authority,
      props.balances,
      props.accountFlags,
      props.emissionsDestinationAccount,
      props.healthCache
    );
  }

  async simulateHealthCache(
    program: Program<MarginfiIdlType>,
    bankMap: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankMetadataMap: BankMetadataMap
  ) {
    const accountWithHealthCache = await simulateAccountHealthCacheWithFallback({
      program,
      bankMap,
      oraclePrices,
      marginfiAccount: this,
      balances: this.balances,
      bankMetadataMap: bankMetadataMap,
    });

    return accountWithHealthCache;
  }

  static fromAccountDataRaw(marginfiAccountPk: PublicKey, rawData: Buffer, idl: MarginfiIdlType) {
    const marginfiAccountData = MarginfiAccount.decodeAccountRaw(rawData, idl);
    return MarginfiAccount.fromAccountParsed(marginfiAccountPk, marginfiAccountData);
  }
  // ----------------------------------------------------------------------------
  // Attributes
  // ----------------------------------------------------------------------------

  get activeBalances(): Balance[] {
    return this.balances.filter((b) => b.active);
  }

  getBalance(bankPk: PublicKey): Balance {
    return this.activeBalances.find((b) => b.bankPk.equals(bankPk)) ?? Balance.createEmpty(bankPk);
  }

  get isDisabled(): boolean {
    return this.accountFlags.includes(AccountFlags.ACCOUNT_DISABLED);
  }

  get isFlashLoanEnabled(): boolean {
    return this.accountFlags.includes(AccountFlags.ACCOUNT_IN_FLASHLOAN);
  }

  get isTransferAccountAuthorityEnabled(): boolean {
    return this.accountFlags.includes(AccountFlags.ACCOUNT_TRANSFER_AUTHORITY_ALLOWED);
  }

  setHealthCache(value: HealthCache) {
    this.healthCache = value;
  }

  computeFreeCollateral(opts?: { clamped?: boolean }): BigNumber {
    return computeFreeCollateral(this, opts);
  }

  computeFreeCollateralLegacy(
    banks: Map<string, BankType>,
    oraclePrices: Map<string, OraclePrice>,
    opts?: { clamped?: boolean }
  ): BigNumber {
    return computeFreeCollateralLegacy(this.activeBalances, banks, oraclePrices, opts);
  }

  computeHealthComponents(marginReqType: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeHealthComponents(this, marginReqType);
  }

  /**
   * @deprecated use computeHealthComponents instead
   */
  computeHealthComponentsLegacy(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    marginReqType: MarginRequirementType,
    excludedBanks: PublicKey[] = []
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeHealthComponentsLegacy(this.activeBalances, banks, oraclePrices, marginReqType, excludedBanks);
  }

  /**
   *  @deprecated use computeHealthComponents instead
   */
  computeHealthComponentsWithoutBiasLegacy(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    marginReqType: MarginRequirementType
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeHealthComponentsWithoutBiasLegacy(this.activeBalances, banks, oraclePrices, marginReqType);
  }

  computeAccountValue(): BigNumber {
    return computeAccountValue(this);
  }

  computeNetApy(banks: Map<string, Bank>, oraclePrices: Map<string, OraclePrice>): number {
    return computeNetApy(this, this.activeBalances, banks, oraclePrices);
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
  computeMaxBorrowForBank(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankAddress: PublicKey,
    opts?: {
      emodeImpactStatus?: EmodeImpactStatus;
      volatilityFactor?: number;
      emodeWeights?: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber; collateralTag: EmodeTag };
    }
  ): BigNumber {
    const debug = require("debug")("mfi:computeMaxBorrowForBank");
    const bank = banks.get(bankAddress.toBase58());

    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    if (opts?.emodeWeights) {
      const emodeWeights = opts.emodeWeights; // Create a local reference to avoid null checks
      const collateralTag = emodeWeights.collateralTag;
      const modifiedBanks = new Map(banks);

      // Go through each bank and update the ones with matching tag
      banks.forEach((existingBank, bankKey) => {
        // Only apply to banks with matching tag
        if (existingBank.emode?.emodeTag === collateralTag) {
          modifiedBanks.set(
            bankKey,
            Bank.withEmodeWeights(existingBank, {
              assetWeightMaint: emodeWeights.assetWeightMaint,
              assetWeightInit: emodeWeights.assetWeightInit,
            })
          );
        }
      });

      // Use the modified banks map for computation
      banks = modifiedBanks;
    }

    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    // -------------------------- //
    // isolated asset constraints //
    // -------------------------- //

    const hasLiabilitiesAlready =
      this.activeBalances.filter((b) => b.liabilityShares.gt(0) || !b.bankPk.equals(bankAddress)).length > 0;

    const attemptingToBorrowIsolatedAssetWithActiveDebt =
      bank.config.riskTier === RiskTier.Isolated && hasLiabilitiesAlready;

    debug("attemptingToBorrowIsolatedAssetWithActiveDebt: %s", attemptingToBorrowIsolatedAssetWithActiveDebt);

    const existingLiabilityBanks = this.activeBalances
      .filter((b) => b.liabilityShares.gt(0))
      .map((b) => banks.get(b.bankPk.toBase58())!);

    const attemptingToBorrowNewAssetWithExistingIsolatedDebt = existingLiabilityBanks.some(
      (b) => b.config.riskTier === RiskTier.Isolated && !b.address.equals(bankAddress)
    );

    debug("attemptingToBorrowNewAssetWithExistingIsolatedDebt: %s", attemptingToBorrowNewAssetWithExistingIsolatedDebt);

    if (attemptingToBorrowIsolatedAssetWithActiveDebt || attemptingToBorrowNewAssetWithExistingIsolatedDebt) {
      // User can only withdraw
      return this.computeMaxWithdrawForBank(banks, oraclePrices, bankAddress, opts);
    }

    // ------------- //
    // FC-based calc //
    // ------------- //

    const _volatilityFactor = opts?.volatilityFactor ?? 1;

    const balance = this.getBalance(bankAddress);

    const useCache =
      opts?.emodeImpactStatus === EmodeImpactStatus.InactiveEmode ||
      opts?.emodeImpactStatus === EmodeImpactStatus.ExtendEmode;

    let freeCollateral = useCache
      ? this.computeFreeCollateral().times(_volatilityFactor)
      : this.computeFreeCollateralLegacy(banks, oraclePrices);

    debug("Free collateral: %d", freeCollateral.toFixed(6));

    const untiedCollateralForBank = BigNumber.min(
      bank.computeAssetUsdValue(priceInfo, balance.assetShares, MarginRequirementType.Initial, PriceBias.Lowest),
      freeCollateral
    );

    const priceLowestBias = getPrice(priceInfo, PriceBias.Lowest, true);
    const priceHighestBias = getPrice(priceInfo, PriceBias.Highest, true);
    const assetWeight = bank.getAssetWeight(MarginRequirementType.Initial, priceInfo);
    const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Initial);

    if (assetWeight.eq(0)) {
      return balance
        .computeQuantityUi(bank)
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
  computeMaxWithdrawForBank(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankAddress: PublicKey,
    opts?: { volatilityFactor?: number }
  ): BigNumber {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const _volatilityFactor = opts?.volatilityFactor ?? 1;

    const initAssetWeight = bank.getAssetWeight(MarginRequirementType.Initial, priceInfo);
    const maintAssetWeight = bank.getAssetWeight(MarginRequirementType.Maintenance, priceInfo);
    const balance = this.getBalance(bankAddress);

    const freeCollateral = this.computeFreeCollateral();
    const initCollateralForBank = bank.computeAssetUsdValue(
      priceInfo,
      balance.assetShares,
      MarginRequirementType.Initial,
      PriceBias.Lowest
    );

    const entireBalance = balance.computeQuantityUi(bank).assets;

    const { liabilities: liabilitiesInit } = this.computeHealthComponents(MarginRequirementType.Initial);

    // -------------------------------------------------- //
    // isolated bank (=> init weight = maint weight = 0)  //
    // or collateral bank with 0-weights (does not happen //
    // in practice)                                       //
    // -------------------------------------------------- //

    if (bank.config.riskTier === RiskTier.Isolated || (initAssetWeight.isZero() && maintAssetWeight.isZero())) {
      if (freeCollateral.isZero() && !liabilitiesInit.isZero()) {
        // if account is already below init requirements and has active debt, prevent any withdrawal even if those don't count as collateral
        // inefficient, but reflective of contract which does not look at action delta, but only end state atm
        return new BigNumber(0);
      } else {
        return entireBalance;
      }
    }

    // ----------------------------- //
    // collateral bank being retired //
    // ----------------------------- //

    if (initAssetWeight.isZero() && !maintAssetWeight.isZero()) {
      if (liabilitiesInit.eq(0)) {
        return entireBalance;
      } else if (freeCollateral.isZero()) {
        return new BigNumber(0); // inefficient, but reflective of contract which does not look at action delta, but only end state
      } else {
        const { liabilities: maintLiabilities, assets: maintAssets } = this.computeHealthComponents(
          MarginRequirementType.Maintenance
        );
        const maintUntiedCollateral = maintAssets.minus(maintLiabilities);

        const priceLowestBias = getPrice(priceInfo, PriceBias.Lowest, true);
        const maintWeightedPrice = priceLowestBias.times(maintAssetWeight);

        return maintUntiedCollateral.div(maintWeightedPrice);
      }
    }

    // ------------------------------------- //
    // collateral bank with positive weights //
    // ------------------------------------- //
    // bypass volatility factor if no liabilities or if all collateral is untied
    if (liabilitiesInit.isZero() || initCollateralForBank.lte(freeCollateral)) {
      return entireBalance;
    }

    // apply volatility factor to avoid failure due to price volatility / slippage
    const initUntiedCollateralForBank = freeCollateral.times(_volatilityFactor);

    const priceLowestBias = getPrice(priceInfo, PriceBias.Lowest, true);
    const initWeightedPrice = priceLowestBias.times(initAssetWeight);
    const maxWithdraw = initUntiedCollateralForBank.div(initWeightedPrice);

    return maxWithdraw;
  }

  /**
   * Calculate the price at which the user position for the given bank will lead to liquidation, all other prices constant.
   */
  public computeLiquidationPriceForBank(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankAddress: PublicKey
  ): number | null {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const balance = this.getBalance(bankAddress);

    if (!balance.active) return null;

    const { assets: assetBank, liabilities: liabilitiesBank } = balance.computeUsdValue(
      bank,
      priceInfo,
      MarginRequirementType.Maintenance
    );

    const { assets: assetsAccount, liabilities: liabilitiesAccount } = this.computeHealthComponents(
      MarginRequirementType.Maintenance
    );

    const assets = assetsAccount.minus(assetBank);
    const liabilities = liabilitiesAccount.minus(liabilitiesBank);

    const isLending = balance.liabilityShares.isZero();
    const { assets: assetQuantityUi, liabilities: liabQuantitiesUi } = balance.computeQuantityUi(bank);

    let liquidationPrice: BigNumber;
    if (isLending) {
      if (liabilities.eq(0)) return null;

      const assetWeight = bank.getAssetWeight(MarginRequirementType.Maintenance, priceInfo);
      const priceConfidence = getPrice(priceInfo, PriceBias.None, false).minus(
        getPrice(priceInfo, PriceBias.Lowest, false)
      );
      liquidationPrice = liabilities.minus(assets).div(assetQuantityUi.times(assetWeight)).plus(priceConfidence);
    } else {
      const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Maintenance);
      const priceConfidence = getPrice(priceInfo, PriceBias.Highest, false).minus(
        getPrice(priceInfo, PriceBias.None, false)
      );
      liquidationPrice = assets.minus(liabilities).div(liabQuantitiesUi.times(liabWeight)).minus(priceConfidence);
    }
    if (liquidationPrice.isNaN() || liquidationPrice.lt(0) || !liquidationPrice.isFinite()) return null;
    return liquidationPrice.toNumber();
  }

  /**
   * Calculate the price at which the user position for the given bank will lead to liquidation, all other prices constant.
   */
  public computeLiquidationPriceForBankHealth(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankAddress: PublicKey,
    opts?: {
      assetWeightMaint: BigNumber;
    }
  ): number | null {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const balance = this.getBalance(bankAddress);

    if (!balance.active) return null;

    const isLending = balance.liabilityShares.isZero();

    let assetValueMaint = this.healthCache.assetValueMaint;
    let liabValueMaint = this.healthCache.liabilityValueMaint;

    const { assets: assetQuantityUi, liabilities: liabQuantitiesUi } = balance.computeQuantityUi(bank);

    let liquidationPrice: BigNumber;
    if (isLending) {
      if (liabValueMaint.eq(0)) return null;

      const assetWeight = bank.getAssetWeight(
        MarginRequirementType.Maintenance,
        priceInfo,
        undefined,
        opts?.assetWeightMaint
      );
      const priceConfidence = getPrice(priceInfo, PriceBias.None, false).minus(
        getPrice(priceInfo, PriceBias.Lowest, false)
      );
      liquidationPrice = liabValueMaint
        .minus(assetValueMaint)
        .div(assetQuantityUi.times(assetWeight))
        .plus(priceConfidence);
    } else {
      const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Maintenance);
      const priceConfidence = getPrice(priceInfo, PriceBias.Highest, false).minus(
        getPrice(priceInfo, PriceBias.None, false)
      );
      liquidationPrice = assetValueMaint
        .minus(liabValueMaint)
        .div(liabQuantitiesUi.times(liabWeight))
        .minus(priceConfidence);
    }
    if (liquidationPrice.isNaN() || liquidationPrice.lt(0) || !liquidationPrice.isFinite()) return null;
    return liquidationPrice.toNumber();
  }

  /**
   * Calculate the price at which the user position for the given bank and amount will lead to liquidation, all other prices constant.
   */
  public computeLiquidationPriceForBankAmount(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankAddress: PublicKey,
    isLending: boolean,
    amount: number
  ): number | null {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const balance = this.getBalance(bankAddress);

    if (!balance.active) return null;

    const { assets: assetBank, liabilities: liabilitiesBank } = balance.computeUsdValue(
      bank,
      priceInfo,
      MarginRequirementType.Maintenance
    );

    const { assets: assetsAccount, liabilities: liabilitiesAccount } = this.computeHealthComponents(
      MarginRequirementType.Maintenance
    );

    const assets = assetsAccount.minus(assetBank);
    const liabilities = liabilitiesAccount.minus(liabilitiesBank);

    const amountBn = new BigNumber(amount);

    let liquidationPrice: BigNumber;
    if (isLending) {
      if (liabilities.eq(0)) return null;

      const assetWeight = bank.getAssetWeight(MarginRequirementType.Maintenance, priceInfo);
      const priceConfidence = getPrice(priceInfo, PriceBias.None, false).minus(
        getPrice(priceInfo, PriceBias.Lowest, false)
      );
      liquidationPrice = liabilities.minus(assets).div(amountBn.times(assetWeight)).plus(priceConfidence);
    } else {
      const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Maintenance);
      const priceConfidence = getPrice(priceInfo, PriceBias.Highest, false).minus(
        getPrice(priceInfo, PriceBias.None, false)
      );
      liquidationPrice = assets.minus(liabilities).div(amountBn.times(liabWeight)).minus(priceConfidence);
    }
    if (liquidationPrice.isNaN() || liquidationPrice.lt(0)) return null;
    return liquidationPrice.toNumber();
  }

  // Calculate the max amount of collateral to liquidate to bring an account maint health to 0 (assuming negative health).
  //
  // The asset amount is bounded by 2 constraints,
  // (1) the amount of liquidated collateral cannot be more than the balance,
  // (2) the amount of covered liablity cannot be more than existing liablity.
  computeMaxLiquidatableAssetAmount(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    assetBankAddress: PublicKey,
    liabilityBankAddress: PublicKey
  ): BigNumber {
    const debug = require("debug")("mfi:getMaxLiquidatableAssetAmount");

    const assetBank = banks.get(assetBankAddress.toBase58());
    if (!assetBank) throw Error(`Bank ${assetBankAddress.toBase58()} not found`);
    const assetPriceInfo = oraclePrices.get(assetBankAddress.toBase58());
    if (!assetPriceInfo) throw Error(`Price info for ${assetBankAddress.toBase58()} not found`);

    const liabilityBank = banks.get(liabilityBankAddress.toBase58());
    if (!liabilityBank) throw Error(`Bank ${liabilityBankAddress.toBase58()} not found`);
    const liabilityPriceInfo = oraclePrices.get(liabilityBankAddress.toBase58());
    if (!liabilityPriceInfo) throw Error(`Price info for ${liabilityBankAddress.toBase58()} not found`);

    const { assets, liabilities } = this.computeHealthComponents(MarginRequirementType.Maintenance);
    const currentHealth = assets.minus(liabilities);

    const priceAssetLower = getPrice(assetPriceInfo, PriceBias.Lowest, false);
    const priceAssetMarket = getPrice(assetPriceInfo, PriceBias.None, false);
    const assetMaintWeight = assetBank.config.assetWeightMaint;

    const liquidationDiscount = new BigNumber(0.95);

    const priceLiabHighest = getPrice(liabilityPriceInfo, PriceBias.Highest, false);
    const priceLiabMarket = getPrice(liabilityPriceInfo, PriceBias.None, false);
    const liabMaintWeight = liabilityBank.config.liabilityWeightMaint;

    debug(
      "h: %d, w_a: %d, w_l: %d, d: %d",
      currentHealth.toFixed(6),
      assetMaintWeight,
      liabMaintWeight,
      liquidationDiscount
    );

    const underwaterMaintUsdValue = currentHealth.div(
      assetMaintWeight.minus(liabMaintWeight.times(liquidationDiscount))
    );

    debug("Underwater maint usd to adjust: $%d", underwaterMaintUsdValue.toFixed(6));

    // MAX asset amount bounded by available asset amount
    const assetBalance = this.getBalance(assetBankAddress);
    const assetsAmountUi = assetBalance.computeQuantityUi(assetBank).assets;
    const assetsUsdValue = assetsAmountUi.times(priceAssetLower);

    // MAX asset amount bounded by available liability amount
    const liabilityBalance = this.getBalance(liabilityBankAddress);
    const liabilitiesAmountUi = liabilityBalance.computeQuantityUi(liabilityBank).liabilities;
    const liabUsdValue = liabilitiesAmountUi.times(liquidationDiscount).times(priceLiabHighest);

    debug(
      "Collateral amount: %d, price: %d, value: %d",
      assetsAmountUi.toFixed(6),
      priceAssetMarket.toFixed(6),
      assetsUsdValue.times(priceAssetMarket).toFixed(6)
    );

    debug(
      "Liab amount: %d, price: %d, value: %d",
      liabilitiesAmountUi.toFixed(6),
      priceLiabMarket.toFixed(6),
      liabUsdValue.toFixed(6)
    );

    const maxLiquidatableUsdValue = BigNumber.min(assetsUsdValue, underwaterMaintUsdValue, liabUsdValue);

    debug("Max liquidatable usd value: %d", maxLiquidatableUsdValue.toFixed(6));

    return maxLiquidatableUsdValue.div(priceAssetLower);
  }

  getHealthCheckAccounts(
    banks: Map<string, Bank>,
    mandatoryBanks: PublicKey[] = [],
    excludedBanks: PublicKey[] = []
  ): BankType[] {
    return computeHealthCheckAccounts(this.balances, banks, mandatoryBanks, excludedBanks);
  }

  /**
   * Determines which E-mode pairs are currently active for this account based on its balances
   *
   * @param emodePairs - All available E-mode pairs to check against the account's balances
   * @returns Array of active E-mode pairs for this account, or empty array if no E-mode is active
   */
  computeActiveEmodePairs(emodePairs: EmodePair[]): EmodePair[] {
    const activeLiabilities = this.activeBalances
      .filter((balance) => balance.liabilityShares.gt(0))
      .map((balance) => balance.bankPk);
    const activeCollateral = this.activeBalances
      .filter((balance) => balance.assetShares.gt(0))
      .map((balance) => balance.bankPk);
    return computeActiveEmodePairs(emodePairs, activeLiabilities, activeCollateral);
  }

  /**
   * Calculates the impact of different actions on E-mode status for each bank
   *
   * For each bank, this method simulates the following actions and their effect on E-mode:
   * - Borrowing from the bank (for banks not currently borrowed from)
   * - Supplying to the bank (for supported collateral banks not currently supplied)
   * - Repaying all borrowing from the bank (for banks with active liabilities)
   * - Withdrawing all supply from the bank (for banks with active collateral)
   *
   * @param emodePairs - All available E-mode pairs to check against
   * @param banks - Array of bank PublicKeys to calculate impacts for
   * @returns Object mapping bank PublicKey strings to impact analysis for each possible action
   */
  computeEmodeImpacts(emodePairs: EmodePair[], banks: PublicKey[]): Record<string, ActionEmodeImpact> {
    const activeLiabilities = this.activeBalances
      .filter((balance) => balance.liabilityShares.gt(0))
      .map((balance) => balance.bankPk);
    const activeCollateral = this.activeBalances
      .filter((balance) => balance.assetShares.gt(0))
      .map((balance) => balance.bankPk);

    return computeEmodeImpacts(emodePairs, activeLiabilities, activeCollateral, banks);
  }

  // ----------------------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------------------

  async makeDepositIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    mintDatas: Map<string, MintData>,
    amount: Amount,
    bankAddress: PublicKey,
    opts: MakeDepositIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const mintData = mintDatas.get(bankAddress.toBase58());
    if (!mintData) throw Error(`Mint for bank ${bankAddress.toBase58()} not found`);

    const wrapAndUnwrapSol = opts.wrapAndUnwrapSol ?? true;
    const wSolBalanceUi = opts.wSolBalanceUi ?? 0;

    const userTokenAtaPk = getAssociatedTokenAddressSync(bank.mint, this.authority, true, mintData.tokenProgram); // We allow off curve addresses here to support Fuse.

    const remainingAccounts = mintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)
      ? [{ pubkey: mintData.mint, isSigner: false, isWritable: false }]
      : [];

    const depositIxs = [];

    if (bank.mint.equals(NATIVE_MINT) && wrapAndUnwrapSol) {
      depositIxs.push(...makeWrapSolIxs(this.authority, new BigNumber(amount).minus(wSolBalanceUi)));
    }

    const depositIx = await instructions.makeDepositIx(
      program,
      {
        marginfiAccount: this.address,
        signerTokenAccount: userTokenAtaPk,
        bank: bank.address,
        tokenProgram: mintData.tokenProgram,
        authority: opts.overrideInferAccounts?.authority ?? this.authority,
        group: opts.overrideInferAccounts?.group ?? this.group,
        liquidityVault: opts.overrideInferAccounts?.liquidityVault,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts
    );
    depositIxs.push(depositIx);

    return {
      instructions: depositIxs,
      keys: [],
    };
  }

  async makeRepayIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    mintDatas: Map<string, MintData>,
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    opts: MakeRepayIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const mintData = mintDatas.get(bankAddress.toBase58());
    if (!mintData) throw Error(`Mint data for bank ${bankAddress.toBase58()} not found`);

    const wrapAndUnwrapSol = opts.wrapAndUnwrapSol ?? true;
    const wSolBalanceUi = opts.wSolBalanceUi ?? 0;

    const repayIxs = [];

    // Add emissions-related instructions if necessary
    if (repayAll && !bank.emissionsMint.equals(PublicKey.default)) {
      repayIxs.push(...(await this.makeWithdrawEmissionsIx(program, banks, mintDatas, bankAddress)).instructions);
    }

    // Add repay-related instructions
    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority, true, mintData.tokenProgram); // We allow off curve addresses here to support Fuse.

    const remainingAccounts: PublicKey[] = [];

    if (mintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      remainingAccounts.push(mintData.mint);
    }

    if (bank.mint.equals(NATIVE_MINT) && wrapAndUnwrapSol) {
      repayIxs.push(...makeWrapSolIxs(this.authority, new BigNumber(amount).minus(wSolBalanceUi)));
    }

    const repayIx = await instructions.makeRepayIx(
      program,
      {
        marginfiAccount: this.address,
        signerTokenAccount: userAta,
        bank: bankAddress,
        tokenProgram: mintData.tokenProgram,
        authority: opts.overrideInferAccounts?.authority,
        group: opts.overrideInferAccounts?.group,
        liquidityVault: opts.overrideInferAccounts?.liquidityVault,
      },
      { amount: uiToNative(amount, bank.mintDecimals), repayAll },
      remainingAccounts.map((account) => ({ pubkey: account, isSigner: false, isWritable: false }))
    );
    repayIxs.push(repayIx);

    return {
      instructions: repayIxs,
      keys: [],
    };
  }

  async makeWithdrawIx(
    program: MarginfiProgram,
    bankMap: Map<string, Bank>,
    mintDatas: Map<string, MintData>,
    bankMetadataMap: BankMetadataMap,
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    withdrawOpts: MakeWithdrawIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const bank = bankMap.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const mintData = mintDatas.get(bankAddress.toBase58());
    if (!mintData) throw Error(`Mint data for bank ${bankAddress.toBase58()} not found`);

    const wrapAndUnwrapSol = withdrawOpts.wrapAndUnwrapSol ?? true;
    const createAtas = withdrawOpts.createAtas ?? true;

    const withdrawIxs = [];

    // Add emissions-related instructions if necessary
    if (withdrawAll && !bank.emissionsMint.equals(PublicKey.default) && mintData.emissionTokenProgram) {
      withdrawIxs.push(...(await this.makeWithdrawEmissionsIx(program, bankMap, mintDatas, bankAddress)).instructions);
    }

    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority, true, mintData.tokenProgram); // We allow off curve addresses here to support Fuse.

    if (createAtas) {
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.authority,
        userAta,
        this.authority,
        bank.mint,
        mintData.tokenProgram
      );
      withdrawIxs.push(createAtaIdempotentIx);
    }

    const healthAccounts = withdrawAll
      ? this.getHealthCheckAccounts(bankMap, [], [bankAddress])
      : this.getHealthCheckAccounts(bankMap, [bankAddress], []);

    // Add withdraw-related instructions
    const remainingAccounts: PublicKey[] = [];
    if (mintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      remainingAccounts.push(mintData.mint);
    }
    if (withdrawOpts.observationBanksOverride) {
      remainingAccounts.push(...withdrawOpts.observationBanksOverride);
    } else {
      const accountMetas = computeHealthAccountMetas(healthAccounts, bankMetadataMap);
      remainingAccounts.push(...accountMetas);
    }

    const withdrawIx = await instructions.makeWithdrawIx(
      program,
      {
        marginfiAccount: this.address,
        bank: bank.address,
        destinationTokenAccount: userAta,
        tokenProgram: mintData.tokenProgram,
        authority: withdrawOpts.overrideInferAccounts?.authority,
        group: withdrawOpts.overrideInferAccounts?.group,
      },
      { amount: uiToNative(amount, bank.mintDecimals), withdrawAll },
      remainingAccounts.map((account) => ({ pubkey: account, isSigner: false, isWritable: false }))
    );
    withdrawIxs.push(withdrawIx);

    if (wrapAndUnwrapSol && bank.mint.equals(NATIVE_MINT)) {
      withdrawIxs.push(makeUnwrapSolIx(this.authority));
    }

    return {
      instructions: withdrawIxs,
      keys: [],
    };
  }

  async makeBorrowIx(
    program: MarginfiProgram,
    bankMap: Map<string, Bank>,
    mintDatas: Map<string, MintData>,
    bankMetadataMap: BankMetadataMap,
    amount: Amount,
    bankAddress: PublicKey,
    borrowOpts: MakeBorrowIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const bank = bankMap.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const mintData = mintDatas.get(bankAddress.toBase58());
    if (!mintData) throw Error(`Mint data for bank ${bankAddress.toBase58()} not found`);

    const wrapAndUnwrapSol = borrowOpts.wrapAndUnwrapSol ?? true;
    const createAtas = borrowOpts.createAtas ?? true;

    const borrowIxs: TransactionInstruction[] = [];

    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority, true, mintData.tokenProgram); // We allow off curve addresses here to support Fuse.

    if (createAtas) {
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.authority,
        userAta,
        this.authority,
        bank.mint,
        mintData.tokenProgram
      );
      borrowIxs.push(createAtaIdempotentIx);
    }

    const healthAccounts = this.getHealthCheckAccounts(bankMap, [bankAddress], []);

    const remainingAccounts: PublicKey[] = [];

    if (mintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      remainingAccounts.push(mintData.mint);
    }
    if (borrowOpts?.observationBanksOverride) {
      remainingAccounts.push(...borrowOpts.observationBanksOverride);
    } else {
      const accountMetas = computeHealthAccountMetas(healthAccounts, bankMetadataMap);
      remainingAccounts.push(...accountMetas);
    }

    const borrowIx = await instructions.makeBorrowIx(
      program,
      {
        marginfiAccount: this.address,
        bank: bank.address,
        destinationTokenAccount: userAta,
        tokenProgram: mintData.tokenProgram,
        authority: borrowOpts?.overrideInferAccounts?.authority,
        group: borrowOpts?.overrideInferAccounts?.group,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts.map((account) => ({ pubkey: account, isSigner: false, isWritable: false }))
    );
    borrowIxs.push(borrowIx);

    if (bank.mint.equals(NATIVE_MINT) && wrapAndUnwrapSol) {
      borrowIxs.push(makeUnwrapSolIx(this.authority));
    }

    return {
      instructions: borrowIxs,
      keys: [],
    };
  }

  async makeWithdrawEmissionsIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    mintDatas: Map<string, MintData>,
    bankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const mintData = mintDatas.get(bankAddress.toBase58());
    if (!mintData) throw Error(`Mint data for bank ${bankAddress.toBase58()} not found`);
    if (!mintData.emissionTokenProgram) {
      throw Error(`Emission token program not found for bank ${bankAddress.toBase58()}`);
    }

    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(
      bank.emissionsMint,
      this.authority,
      true,
      mintData.emissionTokenProgram
    ); // We allow off curve addresses here to support Fuse.
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.authority,
      userAta,
      this.authority,
      bank.emissionsMint,
      mintData.emissionTokenProgram
    );
    ixs.push(createAtaIdempotentIx);

    const withdrawEmissionsIx = await instructions.makelendingAccountWithdrawEmissionIx(program, {
      marginfiAccount: this.address,
      destinationAccount: userAta,
      bank: bank.address,
      tokenProgram: mintData.emissionTokenProgram,
    });
    ixs.push(withdrawEmissionsIx);

    return { instructions: ixs, keys: [] };
  }

  async makeLendingAccountLiquidateIx(
    liquidateeMarginfiAccount: MarginfiAccount,
    program: MarginfiProgram,
    bankMap: Map<string, Bank>,
    mintDatas: Map<string, MintData>,
    bankMetadataMap: BankMetadataMap,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabilityBankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const assetBank = bankMap.get(assetBankAddress.toBase58());
    if (!assetBank) throw Error(`Asset bank ${assetBankAddress.toBase58()} not found`);
    const liabilityBank = bankMap.get(liabilityBankAddress.toBase58());
    if (!liabilityBank) throw Error(`Liability bank ${liabilityBankAddress.toBase58()} not found`);
    const liabilityMintData = mintDatas.get(liabilityBankAddress.toBase58());
    if (!liabilityMintData) throw Error(`Mint data for bank ${liabilityBankAddress.toBase58()} not found`);

    let ixs = [];

    const healthAccounts = [
      ...this.getHealthCheckAccounts(bankMap, [liabilityBankAddress, assetBankAddress], []),
      ...liquidateeMarginfiAccount.getHealthCheckAccounts(bankMap, [], []),
    ];

    let remainingAccounts: PublicKey[] = [];

    if (liabilityMintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      remainingAccounts.push(liabilityMintData.mint);
    }

    const accountMetas = computeHealthAccountMetas(healthAccounts, bankMetadataMap);
    remainingAccounts.push(...accountMetas);

    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
    const liquidateIx = await instructions.makeLendingAccountLiquidateIx(
      program,
      {
        assetBank: assetBankAddress,
        liabBank: liabilityBankAddress,
        liquidatorMarginfiAccount: this.address,
        liquidateeMarginfiAccount: liquidateeMarginfiAccount.address,
        tokenProgram: liabilityMintData.tokenProgram,
      },
      { assetAmount: uiToNative(assetQuantityUi, assetBank.mintDecimals) },
      remainingAccounts.map((account) => ({ pubkey: account, isSigner: false, isWritable: false }))
    );
    ixs.push(liquidateIx);

    return { instructions: ixs, keys: [] };
  }

  async makeBeginFlashLoanIx(program: MarginfiProgram, endIndex: number): Promise<InstructionsWrapper> {
    const ix = await instructions.makeBeginFlashLoanIx(
      program,
      {
        marginfiAccount: this.address,
      },
      { endIndex: new BN(endIndex) }
    );
    return { instructions: [ix], keys: [] };
  }

  async makeEndFlashLoanIx(
    program: MarginfiProgram,
    bankMap: Map<string, Bank>,
    projectedActiveBalances: PublicKey[]
  ): Promise<InstructionsWrapper> {
    const banks = projectedActiveBalances.map((account) => {
      const b = bankMap.get(account.toBase58());
      if (!b) throw Error(`Bank ${account.toBase58()} not found`);
      return b;
    });
    const remainingAccounts = computeHealthAccountMetas(banks);
    const ix = await instructions.makeEndFlashLoanIx(
      program,
      {
        marginfiAccount: this.address,
      },
      remainingAccounts.map((account) => ({ pubkey: account, isSigner: false, isWritable: false }))
    );

    return { instructions: [ix], keys: [] };
  }

  async makeAccountAuthorityTransferIx(
    program: MarginfiProgram,
    newAccountAuthority: PublicKey
  ): Promise<InstructionsWrapper> {
    const accountAuthorityTransferIx = await instructions.makeAccountAuthorityTransferIx(program, {
      marginfiAccount: this.address,
      newAuthority: newAccountAuthority,
      feePayer: this.authority,
    });
    return { instructions: [accountAuthorityTransferIx], keys: [] };
  }

  async makeCloseAccountIx(program: MarginfiProgram): Promise<InstructionsWrapper> {
    const ix = await instructions.makeCloseAccountIx(program, {
      marginfiAccount: this.address,
      feePayer: this.authority,
    });
    return { instructions: [ix], keys: [] };
  }

  async makePulseHealthIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    mandatoryBanks: PublicKey[],
    excludedBanks: PublicKey[],
    bankMetadataMap: BankMetadataMap
  ) {
    return makePulseHealthIx(
      program,
      this.address,
      banks,
      this.balances,
      mandatoryBanks,
      excludedBanks,
      bankMetadataMap
    );
  }

  projectActiveBalancesNoCpi(program: MarginfiProgram, instructions: TransactionInstruction[]): PublicKey[] {
    let projectedBalances = [...this.balances.map((b) => ({ active: b.active, bankPk: b.bankPk }))];

    for (let index = 0; index < instructions.length; index++) {
      const ix = instructions[index];

      if (!ix.programId.equals(program.programId)) continue;

      const borshCoder = new BorshInstructionCoder(program.idl);
      const decoded = borshCoder.decode(ix.data, "base58");
      if (!decoded) continue;

      const ixArgs = decoded.data as any;

      switch (decoded.name) {
        case "lendingAccountBorrow":
        case "lendingAccountDeposit": {
          const targetBank = new PublicKey(ix.keys[3].pubkey);
          const targetBalance = projectedBalances.find((b) => b.bankPk.equals(targetBank));
          if (!targetBalance) {
            const firstInactiveBalanceIndex = projectedBalances.findIndex((b) => !b.active);
            if (firstInactiveBalanceIndex === -1) {
              throw Error("No inactive balance found");
            }

            projectedBalances[firstInactiveBalanceIndex].active = true;
            projectedBalances[firstInactiveBalanceIndex].bankPk = targetBank;
          }
          break;
        }
        case "lendingAccountRepay":
        case "lendingAccountWithdraw": {
          const targetBank = new PublicKey(ix.keys[3].pubkey);
          const targetBalance = projectedBalances.find((b) => b.bankPk.equals(targetBank));
          if (!targetBalance) {
            throw Error(
              `Balance for bank ${targetBank.toBase58()} should be projected active at this point (ix ${index}: ${
                decoded.name
              }))`
            );
          }

          if (ixArgs.repayAll || ixArgs.withdrawAll) {
            targetBalance.active = false;
            targetBalance.bankPk = PublicKey.default;
          }
        }
        default: {
          continue;
        }
      }
    }

    return projectedBalances.filter((b) => b.active).map((b) => b.bankPk);
  }

  wrapInstructionForWSol(ix: TransactionInstruction, amount: Amount = new BigNumber(0)): TransactionInstruction[] {
    return [...makeWrapSolIxs(this.authority, new BigNumber(amount)), ix, makeUnwrapSolIx(this.authority)];
  }

  public describe(banks: BankMap, oraclePrices: OraclePriceMap): string {
    const { assets, liabilities } = this.computeHealthComponents(MarginRequirementType.Equity);
    const { assets: assetsMaint, liabilities: liabilitiesMaint } = this.computeHealthComponents(
      MarginRequirementType.Maintenance
    );
    const { assets: assetsInit, liabilities: liabilitiesInit } = this.computeHealthComponents(
      MarginRequirementType.Initial
    );
    let description = `
- Marginfi account: ${this.address}
- Authority: ${this.authority}
- Total deposits: $${assets.toFixed(6)}
- Total liabilities: $${liabilities.toFixed(6)}
- Equity: $${assets.minus(liabilities).toFixed(6)}
- Health maint: ${assetsMaint.minus(liabilitiesMaint).div(assetsMaint).times(100).toFixed(2)}%
- Health init: ${assetsInit.minus(liabilitiesInit).div(assetsInit).times(100).toFixed(2)}%
- Balances:\n`;

    for (const balance of this.activeBalances) {
      const bank = banks.get(balance.bankPk.toBase58())!;
      const priceInfo = oraclePrices.get(balance.bankPk.toBase58())!;
      description += balance.describe(bank, priceInfo);
    }
    return description;
  }
}

enum MarginRequirementType {
  Initial = 0,
  Maintenance = 1,
  Equity = 2,
}

export interface MakeDepositIxOpts {
  wrapAndUnwrapSol?: boolean;
  wSolBalanceUi?: number;
  overrideInferAccounts?: {
    group?: PublicKey;
    authority?: PublicKey;
    liquidityVault?: PublicKey;
  };
}

export interface MakeRepayIxOpts {
  wrapAndUnwrapSol?: boolean;
  wSolBalanceUi?: number;
  overrideInferAccounts?: {
    group?: PublicKey;
    authority?: PublicKey;
    liquidityVault?: PublicKey;
  };
}

export interface MakeWithdrawIxOpts {
  observationBanksOverride?: PublicKey[];
  wrapAndUnwrapSol?: boolean;
  createAtas?: boolean;
  overrideInferAccounts?: {
    group?: PublicKey;
    authority?: PublicKey;
  };
}

export interface MakeBorrowIxOpts {
  observationBanksOverride?: PublicKey[];
  wrapAndUnwrapSol?: boolean;
  createAtas?: boolean;
  overrideInferAccounts?: {
    group?: PublicKey;
    authority?: PublicKey;
  };
}

export function isWeightedPrice(reqType: MarginRequirementType): boolean {
  return reqType === MarginRequirementType.Initial;
}

export { MarginfiAccount, MarginRequirementType };

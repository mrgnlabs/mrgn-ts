import {
  Amount,
  InstructionsWrapper,
  NATIVE_MINT,
  aprToApy,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  shortenAddress,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import { AccountMeta, ComputeBudgetProgram, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Bank } from "../bank";
import { PriceBias, OraclePrice } from "../price";
import instructions from "../../instructions";
import { MarginfiProgram } from "../../types";
import { makeWrapSolIxs, makeUnwrapSolIx } from "../../utils";
import { Balance, BalanceRaw } from "../balance";
import { BankMap, OraclePriceMap, RiskTier } from "../..";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface MarginfiAccountRaw {
  group: PublicKey;
  authority: PublicKey;
  lendingAccount: { balances: BalanceRaw[] };
}

type MarginRequirementTypeRaw = { initial: {} } | { maintenance: {} } | { equity: {} };

export type { MarginfiAccountRaw, MarginRequirementTypeRaw };

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class MarginfiAccount {
  public address: PublicKey;
  public group: PublicKey;
  public authority: PublicKey;
  public balances: Balance[];

  // ----------------------------------------------------------------------------
  // Factories
  // ----------------------------------------------------------------------------

  constructor(address: PublicKey, marginfiAccountRaw: MarginfiAccountRaw) {
    this.address = address;
    this.group = marginfiAccountRaw.group;
    this.authority = marginfiAccountRaw.authority;
    this.balances = marginfiAccountRaw.lendingAccount.balances.map(Balance.from);
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

  computeFreeCollateral(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    opts?: { clamped?: boolean }
  ): BigNumber {
    const _clamped = opts?.clamped ?? true;

    const { assets, liabilities } = this.computeHealthComponents(banks, oraclePrices, MarginRequirementType.Initial);
    const signedFreeCollateral = assets.minus(liabilities);

    return _clamped ? BigNumber.max(0, signedFreeCollateral) : signedFreeCollateral;
  }

  computeHealthComponents(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    marginReqType: MarginRequirementType,
    excludedBanks: PublicKey[] = []
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const filteredBalances = this.activeBalances.filter(
      (accountBalance) => !excludedBanks.find(b => b.equals(accountBalance.bankPk))
    );
    const [assets, liabilities] = filteredBalances
      .map((accountBalance) => {
        const bank = banks.get(accountBalance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

        const priceInfo = oraclePrices.get(accountBalance.bankPk.toBase58());
        if (!priceInfo) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

        const { assets, liabilities } = accountBalance.getUsdValueWithPriceBias(bank, priceInfo, marginReqType);
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

  computeHealthComponentsWithoutBias(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    marginReqType: MarginRequirementType
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const [assets, liabilities] = this.activeBalances
      .map((accountBalance) => {
        const bank = banks.get(accountBalance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

        const priceInfo = oraclePrices.get(accountBalance.bankPk.toBase58());
        if (!priceInfo) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

        const { assets, liabilities } = accountBalance.computeUsdValue(bank, priceInfo, marginReqType);
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

  computeNetApy(banks: Map<string, Bank>, oraclePrices: Map<string, OraclePrice>): number {
    const { assets, liabilities } = this.computeHealthComponentsWithoutBias(
      banks,
      oraclePrices,
      MarginRequirementType.Equity
    );
    const totalUsdValue = assets.minus(liabilities);
    const apr = this.activeBalances
      .reduce((weightedApr, balance) => {
        const bank = banks.get(balance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${balance.bankPk.toBase58()} not found`);

        const priceInfo = oraclePrices.get(balance.bankPk.toBase58());
        if (!priceInfo) throw Error(`Bank ${shortenAddress(balance.bankPk)} not found`);

        return weightedApr
          .minus(
            bank
              .computeInterestRates()
              .borrowingRate.times(balance.computeUsdValue(bank, priceInfo, MarginRequirementType.Equity).liabilities)
              .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
          )
          .plus(
            bank
              .computeInterestRates()
              .lendingRate.times(balance.computeUsdValue(bank, priceInfo, MarginRequirementType.Equity).assets)
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
  computeMaxBorrowForBank(
    banks: Map<string, Bank>,
    oraclePrices: Map<string, OraclePrice>,
    bankAddress: PublicKey
  ): BigNumber {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const balance = this.getBalance(bankAddress);

    const freeCollateral = this.computeFreeCollateral(banks, oraclePrices);
    const untiedCollateralForBank = BigNumber.min(
      bank.computeAssetUsdValue(priceInfo, balance.assetShares, MarginRequirementType.Initial, PriceBias.Lowest),
      freeCollateral
    );

    const priceLowestBias = bank.getPrice(priceInfo, PriceBias.Lowest);
    const priceHighestBias = bank.getPrice(priceInfo, PriceBias.Highest);
    const assetWeight = bank.getAssetWeight(MarginRequirementType.Initial);
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

    const initAssetWeight = bank.getAssetWeight(MarginRequirementType.Initial);
    const maintAssetWeight = bank.getAssetWeight(MarginRequirementType.Maintenance);
    const balance = this.getBalance(bankAddress);

    const freeCollateral = this.computeFreeCollateral(banks, oraclePrices);
    const initCollateralForBank = bank.computeAssetUsdValue(
      priceInfo,
      balance.assetShares,
      MarginRequirementType.Initial,
      PriceBias.Lowest
    );

    const entireBalance = balance.computeQuantityUi(bank).assets;

    const { liabilities: liabilitiesInit } = this.computeHealthComponents(
      banks,
      oraclePrices,
      MarginRequirementType.Initial
    );

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
      if (freeCollateral.isZero()) {
        return new BigNumber(0); // inefficient, but reflective of contract which does not look at action delta, but only end state
      } else {
        const { liabilities: maintLiabilities, assets: maintAssets } = this.computeHealthComponents(
          banks,
          oraclePrices,
          MarginRequirementType.Maintenance
        );
        const maintUntiedCollateral = maintAssets.minus(maintLiabilities);

        const priceLowestBias = bank.getPrice(priceInfo, PriceBias.Lowest);
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
    // initCollateralForBank > freeCollateral, so volatilityBuffer > 0
    const volatilityBuffer = (initCollateralForBank.minus(freeCollateral)).times(1 - _volatilityFactor);
    const initUntiedCollateralForBank = freeCollateral.minus(volatilityBuffer);

    const priceLowestBias = bank.getPrice(priceInfo, PriceBias.Lowest);
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
    bankAddress: PublicKey,
  ): number | null {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = oraclePrices.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const balance = this.getBalance(bankAddress);

    if (!balance.active) return null;

    const isLending = balance.liabilityShares.isZero();
    const { assets, liabilities } = this.computeHealthComponents(banks, oraclePrices, MarginRequirementType.Maintenance, [bankAddress]);
    const { assets: assetQuantityUi, liabilities: liabQuantitiesUi } = balance.computeQuantityUi(bank);

    if (isLending) {
      if (liabilities.eq(0)) return null;

      const assetWeight = bank.getAssetWeight(MarginRequirementType.Maintenance);
      const priceConfidence = bank.getPrice(priceInfo, PriceBias.None).minus(bank.getPrice(priceInfo, PriceBias.Lowest));
      const liquidationPrice = liabilities.minus(assets).div(assetQuantityUi.times(assetWeight)).plus(priceConfidence);
      return liquidationPrice.toNumber();
    } else {
      const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Maintenance);
      const priceConfidence = bank.getPrice(priceInfo, PriceBias.Highest).minus(bank.getPrice(priceInfo, PriceBias.None));
      const liquidationPrice = assets.minus(liabilities).div(liabQuantitiesUi.times(liabWeight)).minus(priceConfidence);
      return liquidationPrice.toNumber();
    }
  }

      /**
   * Calculate the price at which the user position for the given bank and amount will lead to liquidation, all other prices constant.
   */
      public computeLiquidationPriceForBankAmount(
        banks: Map<string, Bank>,
        oraclePrices: Map<string, OraclePrice>,
        bankAddress: PublicKey,
        isLending: boolean,
        amount: number,
      ): number | null {
        const bank = banks.get(bankAddress.toBase58());
        if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
        const priceInfo = oraclePrices.get(bankAddress.toBase58());
        if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);
    
        const balance = this.getBalance(bankAddress);
    
        if (!balance.active) return null;
    
        const { assets, liabilities } = this.computeHealthComponents(banks, oraclePrices, MarginRequirementType.Maintenance, [bankAddress]);
        const amountBn = new BigNumber(amount)
    
        if (isLending) {
          if (liabilities.eq(0)) return null;
    
          const assetWeight = bank.getAssetWeight(MarginRequirementType.Maintenance);
          const priceConfidence = bank.getPrice(priceInfo, PriceBias.None).minus(bank.getPrice(priceInfo, PriceBias.Lowest));
          const liquidationPrice = liabilities.minus(assets).div(amountBn.times(assetWeight)).plus(priceConfidence);
          return liquidationPrice.toNumber();
        } else {
          const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Maintenance);
          const priceConfidence = bank.getPrice(priceInfo, PriceBias.Highest).minus(bank.getPrice(priceInfo, PriceBias.None));
          const liquidationPrice = assets.minus(liabilities).div(amountBn.times(liabWeight)).minus(priceConfidence);
          return liquidationPrice.toNumber();
        }
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

    const { assets, liabilities } = this.computeHealthComponents(
      banks,
      oraclePrices,
      MarginRequirementType.Maintenance
    );
    const currentHealth = assets.minus(liabilities);

    const priceAssetLower = assetBank.getPrice(assetPriceInfo, PriceBias.Lowest);
    const priceAssetMarket = assetBank.getPrice(assetPriceInfo, PriceBias.None);
    const assetMaintWeight = assetBank.config.assetWeightMaint;

    const liquidationDiscount = new BigNumber(0.95);

    const priceLiabHighest = liabilityBank.getPrice(liabilityPriceInfo, PriceBias.Highest);
    const priceLiabMarket = liabilityBank.getPrice(liabilityPriceInfo, PriceBias.None);
    const liabMaintWeight = liabilityBank.config.liabilityWeightMaint;

    debug("h: %d, w_a: %d, w_l: %d, d: %d", currentHealth.toFixed(6), assetMaintWeight, liabMaintWeight, liquidationDiscount);

    const underwaterMaintUsdValue = currentHealth.div(assetMaintWeight.minus(liabMaintWeight.times(liquidationDiscount)));

    debug("Underwater maint usd to adjust: $%d", underwaterMaintUsdValue.toFixed(6));

    // MAX asset amount bounded by available asset amount
    const assetBalance = this.getBalance(assetBankAddress);
    const assetsAmountUi = assetBalance.computeQuantityUi(assetBank).assets;
    const assetsUsdValue = assetsAmountUi.times(priceAssetLower);

    // MAX asset amount bounded by available liability amount
    const liabilityBalance = this.getBalance(liabilityBankAddress);
    const liabilitiesAmountUi = liabilityBalance.computeQuantityUi(liabilityBank).liabilities;
    const liabUsdValue = liabilitiesAmountUi.times(liquidationDiscount).times(priceLiabHighest);

    debug("Collateral amount: %d, price: %d, value: %d",
      assetsAmountUi.toFixed(6),
      priceAssetMarket.toFixed(6),
      assetsUsdValue.times(priceAssetMarket).toFixed(6)
    );

    debug("Liab amount: %d, price: %d, value: %d",
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
    mandatoryBanks: Bank[] = [],
    excludedBanks: Bank[] = []
  ): AccountMeta[] {
    const mandatoryBanksSet = new Set(mandatoryBanks.map((b) => b.address.toBase58()));
    const excludedBanksSet = new Set(excludedBanks.map((b) => b.address.toBase58()));
    const activeBanks = new Set(this.activeBalances.map((b) => b.bankPk.toBase58()));
    const banksToAdd = new Set([...mandatoryBanksSet].filter((x) => !activeBanks.has(x)));

    let slotsToKeep = banksToAdd.size;
    return this.balances
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
          return balance.bankPk.toBase58();
        }
        const newBank = [...banksToAdd.values()][0];
        banksToAdd.delete(newBank);
        return newBank;
      })
      .flatMap((bankPk) => {
        const bank = banks.get(bankPk);
        if (!bank) throw Error(`Could not find bank ${bankPk}`);
        return [
          {
            pubkey: new PublicKey(bankPk),
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bank.config.oracleKeys[0],
            isSigner: false,
            isWritable: false,
          },
        ];
      });
  }

  // ----------------------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------------------

  async makeDepositIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    amount: Amount,
    bankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    const userTokenAtaPk = getAssociatedTokenAddressSync(bank.mint, this.authority, true); // We allow off curve addresses here to support Fuse.
    const remainingAccounts = this.getHealthCheckAccounts(banks, [bank]);
    const ix = await instructions.makeDepositIx(
      program,
      {
        marginfiGroupPk: this.group,
        marginfiAccountPk: this.address,
        authorityPk: this.authority,
        signerTokenAccountPk: userTokenAtaPk,
        bankPk: bank.address,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts
    );
    const depositIxs = bank.mint.equals(NATIVE_MINT) ? this.wrapInstructionForWSol(ix, amount) : [ix];

    return {
      instructions: depositIxs,
      keys: [],
    };
  }

  async makeRepayIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    let ixs = [];

    // Add additional CU request if necessary
    const activeBalances = this.balances.filter((b) => b.active);
    if (activeBalances.length >= 4) {
      ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    }

    // Add emissions-related instructions if necessary
    if (repayAll && !bank.emissionsMint.equals(PublicKey.default)) {
      const userAta = getAssociatedTokenAddressSync(bank.emissionsMint, this.authority, true); // We allow off curve addresses here to support Fuse.
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.authority,
        userAta,
        this.authority,
        bank.emissionsMint
      );

      ixs.push(createAtaIdempotentIx);
      ixs.push(...(await this.makeWithdrawEmissionsIx(program, banks, bankAddress)).instructions);
    }

    // Add repay-related instructions
    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority, true); // We allow off curve addresses here to support Fuse.
    const remainingAccounts = repayAll
      ? this.getHealthCheckAccounts(banks, [], [bank])
      : this.getHealthCheckAccounts(banks, [bank], []);
    const ix = await instructions.makeRepayIx(
      program,
      {
        marginfiGroupPk: this.group,
        marginfiAccountPk: this.address,
        authorityPk: this.authority,
        signerTokenAccountPk: userAta,
        bankPk: bankAddress,
      },
      { amount: uiToNative(amount, bank.mintDecimals), repayAll },
      remainingAccounts
    );
    const repayIxs = bank.mint.equals(NATIVE_MINT) ? this.wrapInstructionForWSol(ix, amount) : [ix];
    ixs.push(...repayIxs);

    return {
      instructions: ixs,
      keys: [],
    };
  }

  async makeWithdrawIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    let ixs = [];

    // Add additional CU request if necessary
    const activeBalances = this.balances.filter((b) => b.active);
    if (activeBalances.length >= 4) {
      ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    }

    // Add emissions-related instructions if necessary
    if (withdrawAll && !bank.emissionsMint.equals(PublicKey.default)) {
      const userAta = getAssociatedTokenAddressSync(bank.emissionsMint, this.authority, true); // We allow off curve addresses here to support Fuse.
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.authority,
        userAta,
        this.authority,
        bank.emissionsMint
      );

      ixs.push(createAtaIdempotentIx);
      ixs.push(...(await this.makeWithdrawEmissionsIx(program, banks, bankAddress)).instructions);
    }

    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority, true);
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.authority,
      userAta,
      this.authority,
      bank.mint
    );
    ixs.push(createAtaIdempotentIx);

    // Add withdraw-related instructions
    const remainingAccounts = withdrawAll
      ? this.getHealthCheckAccounts(banks, [], [bank])
      : this.getHealthCheckAccounts(banks, [bank], []);
    const ix = await instructions.makeWithdrawIx(
      program,
      {
        marginfiGroupPk: this.group,
        marginfiAccountPk: this.address,
        signerPk: this.authority,
        bankPk: bank.address,
        destinationTokenAccountPk: userAta,
      },
      { amount: uiToNative(amount, bank.mintDecimals), withdrawAll },
      remainingAccounts
    );
    const withdrawIxs = bank.mint.equals(NATIVE_MINT) ? this.wrapInstructionForWSol(ix) : [ix];
    ixs.push(...withdrawIxs);

    return {
      instructions: ixs,
      keys: [],
    };
  }

  async makeBorrowIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    amount: Amount,
    bankAddress: PublicKey,
    opt?: { remainingAccountsBankOverride?: Bank[] } | undefined
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority, true); // We allow off curve addresses here to support Fuse.

    // Add additional CU request if necessary
    const activeBalances = this.balances.filter((b) => b.active);
    if (activeBalances.length >= 4) {
      ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    }

    // Add borrow-related instructions
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.authority,
      userAta,
      this.authority,
      bank.mint
    );
    ixs.push(createAtaIdempotentIx);
    const remainingAccounts = this.getHealthCheckAccounts(
      banks,
      (opt?.remainingAccountsBankOverride?.length ?? 0) > 0 ? opt?.remainingAccountsBankOverride : [bank]
    );
    const ix = await instructions.makeBorrowIx(
      program,
      {
        marginfiGroupPk: this.group,
        marginfiAccountPk: this.address,
        signerPk: this.authority,
        bankPk: bank.address,
        destinationTokenAccountPk: userAta,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts
    );
    const borrowIxs = bank.mint.equals(NATIVE_MINT) ? this.wrapInstructionForWSol(ix) : [ix];
    ixs.push(...borrowIxs);

    return {
      instructions: ixs,
      keys: [],
    };
  }

  async makeWithdrawEmissionsIx(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    bankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(bank.emissionsMint, this.authority, true); // We allow off curve addresses here to support Fuse.
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.authority,
      userAta,
      this.authority,
      bank.emissionsMint
    );
    ixs.push(createAtaIdempotentIx);

    const withdrawEmissionsIx = await instructions.makelendingAccountWithdrawEmissionIx(program, {
      marginfiGroup: this.group,
      marginfiAccount: this.address,
      signer: this.authority,
      bank: bank.address,
      destinationTokenAccount: userAta,
      emissionsMint: bank.emissionsMint,
    });
    ixs.push(withdrawEmissionsIx);

    return { instructions: ixs, keys: [] };
  }

  async makeLendingAccountLiquidateIx(
    liquidateeMarginfiAccount: MarginfiAccount,
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabilityBankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const assetBank = banks.get(assetBankAddress.toBase58());
    if (!assetBank) throw Error(`Asset bank ${assetBankAddress.toBase58()} not found`);
    const liabilityBank = banks.get(liabilityBankAddress.toBase58());
    if (!liabilityBank) throw Error(`Liability bank ${liabilityBankAddress.toBase58()} not found`);

    let ixs = [];

    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
    const liquidateIx = await instructions.makeLendingAccountLiquidateIx(
      program,
      {
        marginfiGroup: this.group,
        signer: this.authority,
        assetBank: assetBankAddress,
        liabBank: liabilityBankAddress,
        liquidatorMarginfiAccount: this.address,
        liquidateeMarginfiAccount: liquidateeMarginfiAccount.address,
      },
      { assetAmount: uiToNative(assetQuantityUi, assetBank.mintDecimals) },
      [
        {
          pubkey: assetBank.config.oracleKeys[0],
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: liabilityBank.config.oracleKeys[0],
          isSigner: false,
          isWritable: false,
        },
        ...this.getHealthCheckAccounts(banks, [liabilityBank, assetBank]),
        ...liquidateeMarginfiAccount.getHealthCheckAccounts(banks),
      ]
    );
    ixs.push(liquidateIx);

    return { instructions: ixs, keys: [] };
  }

  wrapInstructionForWSol(ix: TransactionInstruction, amount: Amount = new BigNumber(0)): TransactionInstruction[] {
    return [...makeWrapSolIxs(this.authority, new BigNumber(amount)), ix, makeUnwrapSolIx(this.authority)];
  }

  public describe(banks: BankMap, oraclePrices: OraclePriceMap): string {
    const { assets, liabilities } = this.computeHealthComponents(banks, oraclePrices, MarginRequirementType.Equity);
    return `
- Marginfi account: ${this.address}
- Total deposits: $${assets.toFixed(6)}
- Total liabilities: $${liabilities.toFixed(6)}
- Equity: $${assets.minus(liabilities).toFixed(6)}
- Health: ${assets.minus(liabilities).div(assets).times(100).toFixed(2)}%
- Balances:  ${this.activeBalances.map((balance) => {
      const bank = banks.get(balance.bankPk.toBase58())!;
      const priceInfo = oraclePrices.get(balance.bankPk.toBase58())!;
      return balance.describe(bank, priceInfo);
    })}`;
  }
}

enum MarginRequirementType {
  Initial = 0,
  Maintenance = 1,
  Equity = 2,
}

export { MarginfiAccount, MarginRequirementType };

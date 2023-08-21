import {
  Amount,
  InstructionsWrapper,
  NATIVE_MINT,
  WrappedI80F48,
  aprToApy,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  nativeToUi,
  shortenAddress,
  uiToNative,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";
import { AccountMeta, ComputeBudgetProgram, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Bank } from "../bank";
import { PriceBias, PriceInfo } from "../price";
import instructions from "~/instructions";
import { MarginfiProgram } from "~/types";
import { makeWrapSolIxs, makeUnwrapSolIx } from "~/utils";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface MarginfiAccountRaw {
  group: PublicKey;
  authority: PublicKey;
  lendingAccount: { balances: BalanceRaw[] };
}

interface BalanceRaw {
  active: boolean;
  bankPk: PublicKey;
  assetShares: WrappedI80F48;
  liabilityShares: WrappedI80F48;
  emissionsOutstanding: WrappedI80F48;
  lastUpdate: number;
}

type MarginRequirementTypeRaw = { initial: {} } | { maintenance: {} } | { equity: {} };

export type { MarginfiAccountRaw, BalanceRaw, MarginRequirementTypeRaw };

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
    priceInfos: Map<string, PriceInfo>,
    opts?: { clamped?: boolean }
  ): BigNumber {
    const _clamped = opts?.clamped ?? true;

    const { assets, liabilities } = this.computeHealthComponents(banks, priceInfos, MarginRequirementType.Initial);
    const signedFreeCollateral = assets.minus(liabilities);

    return _clamped ? BigNumber.max(0, signedFreeCollateral) : signedFreeCollateral;
  }

  computeHealthComponents(
    banks: Map<string, Bank>,
    priceInfos: Map<string, PriceInfo>,
    marginReqType: MarginRequirementType
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const [assets, liabilities] = this.activeBalances
      .map((accountBalance) => {
        const bank = banks.get(accountBalance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

        const priceInfo = priceInfos.get(accountBalance.bankPk.toBase58());
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
    priceInfos: Map<string, PriceInfo>,
    marginReqType: MarginRequirementType
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const [assets, liabilities] = this.activeBalances
      .map((accountBalance) => {
        const bank = banks.get(accountBalance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

        const priceInfo = priceInfos.get(accountBalance.bankPk.toBase58());
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

  computeNetApy(banks: Map<string, Bank>, priceInfos: Map<string, PriceInfo>): number {
    const { assets, liabilities } = this.computeHealthComponentsWithoutBias(
      banks,
      priceInfos,
      MarginRequirementType.Equity
    );
    const totalUsdValue = assets.minus(liabilities);
    const apr = this.activeBalances
      .reduce((weightedApr, balance) => {
        const bank = banks.get(balance.bankPk.toBase58());
        if (!bank) throw Error(`Bank ${balance.bankPk.toBase58()} not found`);

        const priceInfo = priceInfos.get(balance.bankPk.toBase58());
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
    priceInfos: Map<string, PriceInfo>,
    bankAddress: PublicKey
  ): BigNumber {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = priceInfos.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const balance = this.getBalance(bankAddress);

    const freeCollateral = this.computeFreeCollateral(banks, priceInfos);
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
    priceInfos: Map<string, PriceInfo>,
    bankAddress: PublicKey,
    opts?: { volatilityFactor?: number }
  ): BigNumber {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);
    const priceInfo = priceInfos.get(bankAddress.toBase58());
    if (!priceInfo) throw Error(`Price info for ${bankAddress.toBase58()} not found`);

    const _volatilityFactor = opts?.volatilityFactor ?? 1;

    const assetWeight = bank.getAssetWeight(MarginRequirementType.Initial);
    const balance = this.getBalance(bankAddress);

    if (assetWeight.eq(0)) {
      return balance.computeQuantityUi(bank).assets;
    } else {
      const freeCollateral = this.computeFreeCollateral(banks, priceInfos);
      const collateralForBank = bank.computeAssetUsdValue(
        priceInfo,
        balance.assetShares,
        MarginRequirementType.Initial,
        PriceBias.Lowest
      );
      let untiedCollateralForBank: BigNumber;
      if (collateralForBank.lte(freeCollateral)) {
        untiedCollateralForBank = collateralForBank;
      } else {
        untiedCollateralForBank = freeCollateral.times(_volatilityFactor);
      }

      const priceLowestBias = bank.getPrice(priceInfo, PriceBias.Lowest);

      return untiedCollateralForBank.div(priceLowestBias.times(assetWeight));
    }
  }

  // Calculate the max amount of collateral to liquidate to bring an account maint health to 0 (assuming negative health).
  //
  // The asset amount is bounded by 2 constraints,
  // (1) the amount of liquidated collateral cannot be more than the balance,
  // (2) the amount of covered liablity cannot be more than existing liablity.
  computeMaxLiquidatableAssetAmount(
    banks: Map<string, Bank>,
    priceInfos: Map<string, PriceInfo>,
    assetBankAddress: PublicKey,
    liabilityBankAddress: PublicKey
  ): BigNumber {
    const debug = require("debug")("mfi:getMaxLiquidatableAssetAmount");

    const assetBank = banks.get(assetBankAddress.toBase58());
    if (!assetBank) throw Error(`Bank ${assetBankAddress.toBase58()} not found`);
    const assetPriceInfo = priceInfos.get(assetBankAddress.toBase58());
    if (!assetPriceInfo) throw Error(`Price info for ${assetBankAddress.toBase58()} not found`);

    const liabilityBank = banks.get(liabilityBankAddress.toBase58());
    if (!liabilityBank) throw Error(`Bank ${liabilityBankAddress.toBase58()} not found`);
    const liabilityPriceInfo = priceInfos.get(liabilityBankAddress.toBase58());
    if (!liabilityPriceInfo) throw Error(`Price info for ${liabilityBankAddress.toBase58()} not found`);

    const { assets, liabilities } = this.computeHealthComponents(banks, priceInfos, MarginRequirementType.Maintenance);
    const currentHealth = assets.minus(liabilities);

    const priceAssetLower = assetBank.getPrice(assetPriceInfo, PriceBias.Lowest);
    const priceAssetMarket = assetBank.getPrice(assetPriceInfo, PriceBias.None);
    const assetMaintWeight = assetBank.config.assetWeightMaint;

    const liquidationDiscount = new BigNumber(1 - 0.05);

    const priceLiabHighest = liabilityBank.getPrice(liabilityPriceInfo, PriceBias.Highest);
    const priceLiabMarket = liabilityBank.getPrice(liabilityPriceInfo, PriceBias.None);
    const liabMaintWeight = liabilityBank.config.liabilityWeightMaint;

    // MAX amount of asset to liquidate to bring account maint health to 0, regardless of existing balances
    const underwaterMaintValue = currentHealth.div(
      priceAssetLower
        .times(assetMaintWeight)
        .minus(
          priceAssetMarket
            .times(liquidationDiscount)
            .times(priceLiabHighest)
            .times(liabMaintWeight)
            .div(priceLiabMarket)
        )
    );

    // MAX asset amount bounded by available asset amount
    const assetBalance = this.getBalance(assetBankAddress);
    const assetsCap = assetBalance.computeQuantityUi(assetBank).assets;

    // MAX asset amount bounded by available liability amount
    const liabilityBalance = this.getBalance(liabilityBankAddress);
    const liabilitiesForBank = liabilityBalance.computeQuantityUi(assetBank).liabilities;
    const liabilityCap = liabilitiesForBank.times(priceLiabMarket).div(priceAssetMarket.times(liquidationDiscount));

    debug("underwaterValue", underwaterMaintValue.toFixed(6));
    debug("assetsCap", assetsCap.toFixed(6));
    debug("liabilityCap", liabilityCap.toFixed(6));

    return BigNumber.min(assetsCap, liabilityCap, underwaterMaintValue);
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

  async makeDepositIxForAccount(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    amount: Amount,
    bankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    const userTokenAtaPk = getAssociatedTokenAddressSync(bank.mint, this.authority);
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

  async makeRepayIxForAccount(
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
      const userAta = getAssociatedTokenAddressSync(bank.emissionsMint, this.authority);
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.authority,
        userAta,
        this.authority,
        bank.emissionsMint
      );

      ixs.push(createAtaIdempotentIx);
      ixs.push(...(await this.makeWithdrawEmissionsIxForAccount(program, banks, bankAddress)).instructions);
    }

    // Add repay-related instructions
    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority);
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

  async makeWithdrawIxForAccount(
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
      const userAta = getAssociatedTokenAddressSync(bank.emissionsMint, this.authority);
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.authority,
        userAta,
        this.authority,
        bank.emissionsMint
      );

      ixs.push(createAtaIdempotentIx);
      ixs.push(...(await this.makeWithdrawEmissionsIxForAccount(program, banks, bankAddress)).instructions);
    }

    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority);
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

  async makeBorrowIxForAccount(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    amount: Amount,
    bankAddress: PublicKey,
    opt?: { remainingAccountsBankOverride?: Bank[] } | undefined
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(bank.mint, this.authority);

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

  async makeWithdrawEmissionsIxForAccount(
    program: MarginfiProgram,
    banks: Map<string, Bank>,
    bankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const bank = banks.get(bankAddress.toBase58());
    if (!bank) throw Error(`Bank ${bankAddress.toBase58()} not found`);

    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(bank.emissionsMint, this.authority);
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

  async makeLendingAccountLiquidateIxForAccount(
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

    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
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
        ...this.getHealthCheckAccounts(banks, [assetBank, liabilityBank]),
        ...liquidateeMarginfiAccount.getHealthCheckAccounts(banks),
      ]
    );
    ixs.push(liquidateIx);

    return { instructions: ixs, keys: [] };
  }

  wrapInstructionForWSol(ix: TransactionInstruction, amount: Amount = new BigNumber(0)): TransactionInstruction[] {
    return [...makeWrapSolIxs(this.authority, new BigNumber(amount)), ix, makeUnwrapSolIx(this.authority)];
  }
}

class Balance {
  public active: boolean;
  public bankPk: PublicKey;
  public assetShares: BigNumber;
  public liabilityShares: BigNumber;
  public emissionsOutstanding: BigNumber;
  public lastUpdate: number;

  constructor(
    active: boolean,
    bankPk: PublicKey,
    assetShares: BigNumber,
    liabilityShares: BigNumber,
    emissionsOutstanding: BigNumber,
    lastUpdate: number
  ) {
    this.active = active;
    this.bankPk = bankPk;
    this.assetShares = assetShares;
    this.liabilityShares = liabilityShares;
    this.emissionsOutstanding = emissionsOutstanding;
    this.lastUpdate = lastUpdate;
  }

  static from(balanceRaw: BalanceRaw): Balance {
    const active = balanceRaw.active;
    const bankPk = balanceRaw.bankPk;
    const assetShares = wrappedI80F48toBigNumber(balanceRaw.assetShares);
    const liabilityShares = wrappedI80F48toBigNumber(balanceRaw.liabilityShares);
    const emissionsOutstanding = wrappedI80F48toBigNumber(balanceRaw.emissionsOutstanding);
    const lastUpdate = balanceRaw.lastUpdate;

    return new Balance(active, bankPk, assetShares, liabilityShares, emissionsOutstanding, lastUpdate);
  }

  static createEmpty(bankPk: PublicKey): Balance {
    return new Balance(false, bankPk, new BigNumber(0), new BigNumber(0), new BigNumber(0), 0);
  }

  computeUsdValue(
    bank: Bank,
    priceInfo: PriceInfo,
    marginRequirementType: MarginRequirementType = MarginRequirementType.Equity
  ): { assets: BigNumber; liabilities: BigNumber } {
    const assetsValue = bank.computeAssetUsdValue(priceInfo, this.assetShares, marginRequirementType, PriceBias.None);
    const liabilitiesValue = bank.computeAssetUsdValue(
      priceInfo,
      this.liabilityShares,
      marginRequirementType,
      PriceBias.None
    );
    return { assets: assetsValue, liabilities: liabilitiesValue };
  }

  getUsdValueWithPriceBias(
    bank: Bank,
    priceInfo: PriceInfo,
    marginRequirementType: MarginRequirementType = MarginRequirementType.Equity
  ): { assets: BigNumber; liabilities: BigNumber } {
    const assetsValue = bank.computeAssetUsdValue(priceInfo, this.assetShares, marginRequirementType, PriceBias.Lowest);
    const liabilitiesValue = bank.computeAssetUsdValue(
      priceInfo,
      this.liabilityShares,
      marginRequirementType,
      PriceBias.Highest
    );
    return { assets: assetsValue, liabilities: liabilitiesValue };
  }

  computeQuantity(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const assetsQuantity = bank.getAssetQuantity(this.assetShares);
    const liabilitiesQuantity = bank.getLiabilityQuantity(this.liabilityShares);
    return { assets: assetsQuantity, liabilities: liabilitiesQuantity };
  }

  computeQuantityUi(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const assetsQuantity = new BigNumber(nativeToUi(bank.getAssetQuantity(this.assetShares), bank.mintDecimals));
    const liabilitiesQuantity = new BigNumber(
      nativeToUi(bank.getLiabilityQuantity(this.liabilityShares), bank.mintDecimals)
    );
    return { assets: assetsQuantity, liabilities: liabilitiesQuantity };
  }

  computeTotalOutstandingEmissions(bank: Bank): BigNumber {
    const claimedEmissions = this.emissionsOutstanding;
    const unclaimedEmissions = this.computeClaimedEmissions(bank, Date.now() / 1000);
    return claimedEmissions.plus(unclaimedEmissions);
  }

  computeClaimedEmissions(bank: Bank, currentTimestamp: number): BigNumber {
    const lendingActive = bank.emissionsActiveLending;
    const borrowActive = bank.emissionsActiveBorrowing;

    const { assets, liabilities } = this.computeQuantity(bank);

    let balanceAmount: BigNumber | null = null;

    if (lendingActive) {
      balanceAmount = assets;
    } else if (borrowActive) {
      balanceAmount = liabilities;
    }

    if (balanceAmount) {
      const lastUpdate = this.lastUpdate;
      const period = new BigNumber(currentTimestamp - lastUpdate);
      const emissionsRate = new BigNumber(bank.emissionsRate);
      const emissions = period.times(balanceAmount).times(emissionsRate).div(31_536_000_000_000);
      const emissionsReal = BigNumber.min(emissions, new BigNumber(bank.emissionsRemaining));

      return emissionsReal;
    }

    return new BigNumber(0);
  }

  describe(bank: Bank, priceInfo: PriceInfo): string {
    let { assets: assetsQt, liabilities: liabsQt } = this.computeQuantityUi(bank);
    let { assets: assetsUsd, liabilities: liabsUsd } = this.computeUsdValue(
      bank,
      priceInfo,
      MarginRequirementType.Equity
    );

    return `
${bank.address} Balance:
- Deposits: ${assetsQt.toFixed(5)} (${assetsUsd.toFixed(5)} USD)
- Borrows: ${liabsQt.toFixed(5)} (${liabsUsd.toFixed(5)} USD)
`;
  }
}

enum MarginRequirementType {
  Initial = 0,
  Maintenance = 1,
  Equity = 2,
}

export type { Balance };
export { MarginfiAccount, MarginRequirementType };

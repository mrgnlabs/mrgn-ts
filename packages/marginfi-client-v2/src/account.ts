import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import { parsePriceData } from "@pythnetwork/client";
import { AccountInfo, AccountMeta, Commitment, ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { aprToApy, DEFAULT_COMMITMENT, MarginfiClient, shortenAddress, uiToNative, wrappedI80F48toBigNumber } from ".";
import Bank, { BankData, PriceBias } from "./bank";
import MarginfiGroup from "./group";
import { MARGINFI_IDL } from "./idl";
import instructions from "./instructions";
import { AccountType, Amount, InstructionsWrapper, MarginfiConfig, MarginfiProgram, WrappedI80F48 } from "./types";
import { nativeToUi } from "./utils";
import { createAssociatedTokenAccountIdempotentInstruction } from "./utils/spl";

/**
 * Wrapper class around a specific marginfi account.
 */
class MarginfiAccount {
  public readonly publicKey: PublicKey;

  private _group: MarginfiGroup;
  private _authority: PublicKey;
  private _lendingBalances: Balance[];

  /**
   * @internal
   */
  private constructor(
    marginfiAccountPk: PublicKey,
    readonly client: MarginfiClient,
    group: MarginfiGroup,
    rawData: MarginfiAccountData
  ) {
    this.publicKey = marginfiAccountPk;

    this._group = group;
    this._authority = rawData.authority;

    this._lendingBalances = rawData.lendingAccount.balances.map((la) => new Balance(la));
  }

  // --- Getters / Setters

  /**
   * Marginfi account authority address
   */
  get authority(): PublicKey {
    return this._authority;
  }

  /**
   * Marginfi group address
   */
  get group(): MarginfiGroup {
    return this._group;
  }

  /**
   * Marginfi group address
   */
  get activeBalances(): Balance[] {
    return this._lendingBalances.filter((la) => la.active);
  }

  /** @internal */
  private get _program() {
    return this.client.program;
  }

  /** @internal */
  private get _config() {
    return this.client.config;
  }

  // --- Factories

  /**
   * MarginfiAccount network factory
   *
   * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
   *
   * @param marginfiAccountPk Address of the target account
   * @param client marginfi client
   * @param commitment Commitment level override
   * @returns MarginfiAccount instance
   */
  static async fetch(
    marginfiAccountPk: Address,
    client: MarginfiClient,
    commitment?: Commitment
  ): Promise<MarginfiAccount> {
    const { config, program } = client;
    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    const accountData = await MarginfiAccount._fetchAccountData(_marginfiAccountPk, config, program, commitment);

    const marginfiAccount = new MarginfiAccount(
      _marginfiAccountPk,
      client,
      await MarginfiGroup.fetch(config, program, commitment),
      accountData
    );

    require("debug")("mfi:margin-account")("Loaded marginfi account %s", _marginfiAccountPk);

    return marginfiAccount;
  }

  /**
   * MarginfiAccount local factory (decoded)
   *
   * Instantiate a MarginfiAccount according to the provided decoded data.
   * Check sanity against provided config.
   *
   * @param marginfiAccountPk Address of the target account
   * @param client marginfi client
   * @param accountData Decoded marginfi marginfi account data
   * @param marginfiGroup MarginfiGroup instance
   * @returns MarginfiAccount instance
   */
  static fromAccountData(
    marginfiAccountPk: Address,
    client: MarginfiClient,
    accountData: MarginfiAccountData,
    marginfiGroup: MarginfiGroup
  ) {
    if (!accountData.group.equals(client.config.groupPk))
      throw Error(
        `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`
      );

    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    return new MarginfiAccount(_marginfiAccountPk, client, marginfiGroup, accountData);
  }

  /**
   * MarginfiAccount local factory (encoded)
   *
   * Instantiate a MarginfiAccount according to the provided encoded data.
   * Check sanity against provided config.
   *
   * @param marginfiAccountPk Address of the target account
   * @param client marginfi client
   * @param marginfiAccountRawData Encoded marginfi marginfi account data
   * @param marginfiGroup MarginfiGroup instance
   * @returns MarginfiAccount instance
   */
  static fromAccountDataRaw(
    marginfiAccountPk: PublicKey,
    client: MarginfiClient,
    marginfiAccountRawData: Buffer,
    marginfiGroup: MarginfiGroup
  ) {
    const marginfiAccountData = MarginfiAccount.decode(marginfiAccountRawData);

    return MarginfiAccount.fromAccountData(marginfiAccountPk, client, marginfiAccountData, marginfiGroup);
  }

  /**
   * Create transaction instruction to deposit collateral into the marginfi account.
   *
   * @param amount Amount to deposit (UI unit)
   * @param bank Bank to deposit to
   * @returns `MarginDepositCollateral` transaction instruction
   */
  async makeDepositIx(amount: Amount, bank: Bank): Promise<InstructionsWrapper> {
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });

    const remainingAccounts = this.getHealthCheckAccounts([bank]);

    const ix = await instructions.makeDepositIx(
      this._program,
      {
        marginfiGroupPk: this.group.publicKey,
        marginfiAccountPk: this.publicKey,
        authorityPk: this.client.provider.wallet.publicKey,
        signerTokenAccountPk: userTokenAtaPk,
        bankPk: bank.publicKey,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts
    );

    return { instructions: [ix], keys: [] };
  }

  /**
   * Deposit collateral into the marginfi account.
   *
   * @param amount Amount to deposit (UI unit)
   * @param bank Bank to deposit to
   * @returns Transaction signature
   */
  async deposit(amount: Amount, bank: Bank): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.publicKey.toString()}:deposit`);

    debug("Depositing %s %s into marginfi account", amount, bank.mint);
    const ixs = await this.makeDepositIx(amount, bank);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx);
    debug("Depositing successful %s", sig);
    await this.reload();
    return sig;
  }

  /**
   * Create transaction instruction to deposit collateral into the marginfi account.
   *
   * @param amount Amount to deposit (UI unit)
   * @param bank Bank to deposit to
   * @param repayAll (optional) Repay all the liability
   * @returns `LendingPool` transaction instruction
   */
  async makeRepayIx(amount: Amount, bank: Bank, repayAll: boolean = false): Promise<InstructionsWrapper> {
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });

    const remainingAccounts = repayAll
      ? this.getHealthCheckAccounts([], [bank])
      : this.getHealthCheckAccounts([bank], []);

    const ix = await instructions.makeRepayIx(
      this._program,
      {
        marginfiGroupPk: this.group.publicKey,
        marginfiAccountPk: this.publicKey,
        authorityPk: this.client.provider.wallet.publicKey,
        signerTokenAccountPk: userTokenAtaPk,
        bankPk: bank.publicKey,
      },
      { amount: uiToNative(amount, bank.mintDecimals), repayAll },
      remainingAccounts
    );

    return { instructions: [ix], keys: [] };
  }

  /**
   * Deposit collateral into the marginfi account.
   *
   * @param amount Amount to deposit (UI unit)
   * @param bank Bank to deposit to
   * @param repayAll (optional) Repay all the liability
   * @returns Transaction signature
   */
  async repay(amount: Amount, bank: Bank, repayAll: boolean = false): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.publicKey.toString()}:repay`);

    debug("Repaying %s %s into marginfi account, repay all: %s", amount, bank.mint, repayAll);
    const ixs = await this.makeRepayIx(amount, bank, repayAll);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx);
    debug("Depositing successful %s", sig);
    await this.reload();
    return sig;
  }

  /**
   * Create transaction instruction to withdraw collateral from the marginfi account.
   *
   * @param amount Amount to withdraw (mint native unit)
   * @param bank Bank to withdraw from
   * @param withdrawAll (optional) Withdraw all the asset
   * @returns `MarginWithdrawCollateral` transaction instruction
   */
  async makeWithdrawIx(amount: Amount, bank: Bank, withdrawAll: boolean = false): Promise<InstructionsWrapper> {
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });

    const remainingAccounts = withdrawAll
      ? this.getHealthCheckAccounts([], [bank])
      : this.getHealthCheckAccounts([bank], []);

    const ix = await instructions.makeWithdrawIx(
      this._program,
      {
        marginfiGroupPk: this.group.publicKey,
        marginfiAccountPk: this.publicKey,
        signerPk: this.client.provider.wallet.publicKey,
        bankPk: bank.publicKey,
        destinationTokenAccountPk: userTokenAtaPk,
      },
      { amount: uiToNative(amount, bank.mintDecimals), withdrawAll },
      remainingAccounts
    );

    return { instructions: [ix], keys: [] };
  }

  /**
   * Withdraw collateral from the marginfi account.
   *
   * @param amount Amount to withdraw (UI unit)
   * @param bank Bank to withdraw from
   * @param withdrawAll (optional) Withdraw all the asset
   * @returns Transaction signature
   */
  async withdraw(amount: Amount, bank: Bank, withdrawAll: boolean = false): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.publicKey.toString()}:withdraw`);
    debug("Withdrawing %s from marginfi account", amount);
    const tx = new Transaction();

    const userAta = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.client.provider.wallet.publicKey,
      userAta,
      this.client.provider.wallet.publicKey,
      bank.mint
    );
    tx.add(createAtaIdempotentIx);

    const ixs = await this.makeWithdrawIx(amount, bank, withdrawAll);
    tx.add(...ixs.instructions);

    const sig = await this.client.processTransaction(tx);
    debug("Withdrawing successful %s", sig);
    await this.reload();
    return sig;
  }

  /**
   * Create transaction instruction to withdraw collateral from the marginfi account.
   *
   * @param amount Amount to withdraw (mint native unit)
   * @param bank Bank to withdraw from
   * @returns `MarginWithdrawCollateral` transaction instruction
   */
  async makeBorrowIx(amount: Amount, bank: Bank): Promise<InstructionsWrapper> {
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });

    const remainingAccounts = this.getHealthCheckAccounts([bank]);

    const ix = await instructions.makeBorrowIx(
      this._program,
      {
        marginfiGroupPk: this.group.publicKey,
        marginfiAccountPk: this.publicKey,
        signerPk: this.client.provider.wallet.publicKey,
        bankPk: bank.publicKey,
        destinationTokenAccountPk: userTokenAtaPk,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
      remainingAccounts
    );

    return { instructions: [ix], keys: [] };
  }

  /**
   * Withdraw collateral from the marginfi account.
   *
   * @param amount Amount to withdraw (UI unit)
   * @param bank Bank to withdraw from
   * @returns Transaction signature
   */
  async borrow(amount: Amount, bank: Bank): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.publicKey.toString()}:borrow`);
    debug("Borrowing %s from marginfi account", amount);
    const tx = new Transaction();

    const userAta = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.client.provider.wallet.publicKey,
      userAta,
      this.client.provider.wallet.publicKey,
      bank.mint
    );
    tx.add(createAtaIdempotentIx);

    const ixs = await this.makeBorrowIx(amount, bank);
    tx.add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx);
    debug("Withdrawing successful %s", sig);
    await this.reload();
    return sig;
  }

  // --- Others

  getHealthCheckAccounts(mandatoryBanks: Bank[] = [], excludedBanks: Bank[] = []): AccountMeta[] {
    const mandatoryBanksSet = new Set(mandatoryBanks.map((b) => b.publicKey.toBase58()));
    const excludedBanksSet = new Set(excludedBanks.map((b) => b.publicKey.toBase58()));
    const activeBanks = new Set(this.activeBalances.map((b) => b.bankPk.toBase58()));
    const banksToAdd = new Set([...mandatoryBanksSet].filter((x) => !activeBanks.has(x)));

    let slotsToKeep = banksToAdd.size;
    return this._lendingBalances
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
        const bank = this._group.getBankByPk(bankPk);
        if (bank === null) throw Error(`Could not find bank ${bankPk}`);
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

  /**
   * Fetch marginfi account data.
   * Check sanity against provided config.
   *
   * @param accountAddress account address
   * @param config marginfi config
   * @param program marginfi Anchor program
   * @param commitment commitment override
   * @returns Decoded marginfi account data struct
   */
  private static async _fetchAccountData(
    accountAddress: Address,
    config: MarginfiConfig,
    program: MarginfiProgram,
    commitment?: Commitment
  ): Promise<MarginfiAccountData> {
    const mergedCommitment = commitment ?? program.provider.connection.commitment ?? DEFAULT_COMMITMENT;

    const data: MarginfiAccountData = (await program.account.marginfiAccount.fetch(
      accountAddress,
      mergedCommitment
    )) as any;

    if (!data.group.equals(config.groupPk))
      throw Error(`Marginfi account tied to group ${data.group.toBase58()}. Expected: ${config.groupPk.toBase58()}`);

    return data;
  }

  /**
   * Decode marginfi account data according to the Anchor IDL.
   *
   * @param encoded Raw data buffer
   * @returns Decoded marginfi account data struct
   */
  static decode(encoded: Buffer): MarginfiAccountData {
    const coder = new BorshCoder(MARGINFI_IDL);
    return coder.accounts.decode(AccountType.MarginfiAccount, encoded);
  }

  /**
   * Decode marginfi account data according to the Anchor IDL.
   *
   * @param decoded Marginfi account data struct
   * @returns Raw data buffer
   */
  static async encode(decoded: MarginfiAccountData): Promise<Buffer> {
    const coder = new BorshCoder(MARGINFI_IDL);
    return await coder.accounts.encode(AccountType.MarginfiAccount, decoded);
  }

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  async reload() {
    require("debug")(`mfi:margin-account:${this.publicKey.toBase58().toString()}:loader`)("Reloading account data");
    const [marginfiGroupAi, marginfiAccountAi] = await this._loadGroupAndAccountAi();
    const marginfiAccountData = MarginfiAccount.decode(marginfiAccountAi.data);
    if (!marginfiAccountData.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountData.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );

    const bankAddresses = this._config.banks.map((b) => b.address);
    let bankAccountsData = await this._program.account.bank.fetchMultiple(bankAddresses);

    let nullAccounts = [];
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] === null) nullAccounts.push(bankAddresses[i]);
    }
    if (nullAccounts.length > 0) {
      throw Error(`Failed to fetch banks ${nullAccounts}`);
    }

    const pythAccounts = await this._program.provider.connection.getMultipleAccountsInfo(
      bankAccountsData.map((b) => (b as BankData).config.oracleKeys[0])
    );

    const banks = bankAccountsData.map(
      (bd, index) =>
        new Bank(
          this._config.banks[index].label,
          bankAddresses[index],
          bd as BankData,
          parsePriceData(pythAccounts[index]!.data)
        )
    );

    this._group = MarginfiGroup.fromAccountDataRaw(this._config, this._program, marginfiGroupAi.data, banks);
    this._updateFromAccountData(marginfiAccountData);
  }

  /**
   * Update instance data from provided data struct.
   *
   * @param data Marginfi account data struct
   */
  private _updateFromAccountData(data: MarginfiAccountData) {
    this._authority = data.authority;

    this._lendingBalances = data.lendingAccount.balances.map((la) => new Balance(la));
  }

  private async _loadGroupAndAccountAi(): Promise<AccountInfo<Buffer>[]> {
    const debug = require("debug")(`mfi:margin-account:${this.publicKey.toString()}:loader`);
    debug("Loading marginfi account %s, and group %s", this.publicKey, this._config.groupPk);

    let [marginfiGroupAi, marginfiAccountAi] = await this.client.provider.connection.getMultipleAccountsInfo(
      [this._config.groupPk, this.publicKey],
      DEFAULT_COMMITMENT
    );

    if (!marginfiAccountAi) {
      throw Error("Marginfi account no found");
    }
    if (!marginfiGroupAi) {
      throw Error("Marginfi Group Account no found");
    }

    return [marginfiGroupAi, marginfiAccountAi];
  }

  public getHealthComponents(marginReqType: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const [assets, liabilities] = this.activeBalances
      .map((accountBalance) => {
        const bank = this._group.banks.get(accountBalance.bankPk.toBase58());
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

  public canBeLiquidated(): boolean {
    const { assets, liabilities } = this.getHealthComponents(MarginRequirementType.Maint);

    return assets < liabilities;
  }

  public getBalance(bankPk: PublicKey): Balance {
    return this.activeBalances.find((b) => b.bankPk.equals(bankPk)) ?? Balance.newEmpty(bankPk);
  }

  public getFreeCollateral(): BigNumber {
    const { assets, liabilities } = this.getHealthComponents(MarginRequirementType.Init);

    return BigNumber.max(0, assets.minus(liabilities));
  }

  private _getHealthComponentsWithoutBias(marginReqType: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const [assets, liabilities] = this.activeBalances
      .map((accountBalance) => {
        const bank = this._group.banks.get(accountBalance.bankPk.toBase58());
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

  public computeNetApy(): number {
    const { assets, liabilities } = this._getHealthComponentsWithoutBias(MarginRequirementType.Equity);
    const totalUsdValue = assets.minus(liabilities);
    const apr = this.activeBalances
      .reduce((weightedApr, balance) => {
        const bank = this._group.getBankByPk(balance.bankPk);
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
  public getMaxBorrowForBank(bank: Bank): BigNumber {
    const balance = this.getBalance(bank.publicKey);

    const freeCollateral = this.getFreeCollateral();
    const untiedCollateralForBank = BigNumber.min(
      bank.getAssetUsdValue(balance.assetShares, MarginRequirementType.Init, PriceBias.Lowest),
      freeCollateral
    );

    const priceLowestBias = bank.getPrice(PriceBias.Lowest);
    const priceHighestBias = bank.getPrice(PriceBias.Highest);
    const depositWeight = bank.getAssetWeight(MarginRequirementType.Init);
    const liabWeight = bank.getLiabilityWeight(MarginRequirementType.Init);

    if (depositWeight.eq(0)) {
      return balance.getQuantityUi(bank).assets.plus(freeCollateral.minus(untiedCollateralForBank).div(priceHighestBias.times(liabWeight)))
    } else {
      return untiedCollateralForBank
        .div(priceLowestBias.times(depositWeight))
        .plus(freeCollateral.minus(untiedCollateralForBank).div(priceHighestBias.times(liabWeight)));
    }
  }

  /**
   * Calculate the maximum amount that can be withdrawn form a bank without borrowing.
   */
  public getMaxWithdrawForBank(bank: Bank): BigNumber {
    const assetWeight = bank.getAssetWeight(MarginRequirementType.Init);
    const balance = this.getBalance(bank.publicKey);

    if (assetWeight.eq(0)) {
      return balance.getQuantityUi(bank).assets
    } else {
      const freeCollateral = this.getFreeCollateral();
      const untiedCollateralForBank = BigNumber.min(
        bank.getAssetUsdValue(balance.assetShares, MarginRequirementType.Init, PriceBias.Lowest),
        freeCollateral
      );

      const priceLowestBias = bank.getPrice(PriceBias.Lowest);

      return untiedCollateralForBank.div(priceLowestBias.times(assetWeight));
    }
  }

  public async makeLendingAccountLiquidateIx(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBank: Bank,
    assetQuantityUi: Amount,
    liabBank: Bank
  ): Promise<InstructionsWrapper> {
    const ix = await instructions.makeLendingAccountLiquidateIx(
      this._program,
      {
        marginfiGroup: this._config.groupPk,
        signer: this.client.provider.wallet.publicKey,
        assetBank: assetBank.publicKey,
        liabBank: liabBank.publicKey,
        liquidatorMarginfiAccount: this.publicKey,
        liquidateeMarginfiAccount: liquidateeMarginfiAccount.publicKey,
      },
      { assetAmount: uiToNative(assetQuantityUi, assetBank.mintDecimals) },
      [
        {
          pubkey: assetBank.config.oracleKeys[0],
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: liabBank.config.oracleKeys[0],
          isSigner: false,
          isWritable: false,
        },
        ...this.getHealthCheckAccounts([assetBank, liabBank]),
        ...liquidateeMarginfiAccount.getHealthCheckAccounts(),
      ]
    );

    return { instructions: [ix], keys: [] };
  }

  public async lendingAccountLiquidate(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBank: Bank,
    assetQuantityUi: Amount,
    liabBank: Bank
  ): Promise<string> {
    const ixw = await this.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      assetBank,
      assetQuantityUi,
      liabBank
    );
    const tx = new Transaction().add(...ixw.instructions, ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    return this.client.processTransaction(tx);
  }

  public toString() {
    const { assets, liabilities } = this.getHealthComponents(MarginRequirementType.Equity);

    let str = `-----------------
  Marginfi account:
    Address: ${this.publicKey.toBase58()}
    Group: ${this.group.publicKey.toBase58()}
    Authority: ${this.authority.toBase58()}
    Equity: ${this.getHealthComponents(MarginRequirementType.Equity).assets.toFixed(6)}
    Equity: ${assets.minus(liabilities).toFixed(6)}
    Assets: ${assets.toFixed(6)},
    Liabilities: ${liabilities.toFixed(6)}`;

    const activeLendingAccounts = this.activeBalances.filter((la) => la.active);
    if (activeLendingAccounts.length > 0) {
      str = str.concat("\n-----------------\nBalances:");
    }
    for (let lendingAccount of activeLendingAccounts) {
      const bank = this._group.getBankByPk(lendingAccount.bankPk);
      if (!bank) {
        console.log(`Bank ${lendingAccount.bankPk} not found`);
        continue;
      }
      const utpStr = `\n  Bank ${bank.label}:
      Address: ${bank.publicKey.toBase58()}
      Mint: ${bank.mint.toBase58()}
      Equity: ${lendingAccount.getUsdValue(bank, MarginRequirementType.Equity)}`;
      str = str.concat(utpStr);
    }

    return str;
  }
}

export default MarginfiAccount;

// Client types

export class Balance {
  active: boolean;
  bankPk: PublicKey;
  assetShares: BigNumber;
  liabilityShares: BigNumber;

  constructor(data: BalanceData) {
    this.active = data.active;
    this.bankPk = data.bankPk;
    this.assetShares = wrappedI80F48toBigNumber(data.assetShares);
    this.liabilityShares = wrappedI80F48toBigNumber(data.liabilityShares);
  }

  public static newEmpty(bankPk: PublicKey): Balance {
    return new Balance({
      active: false,
      bankPk,
      assetShares: { value: new BN(0) },
      liabilityShares: { value: new BN(0) },
    });
  }

  public getUsdValue(bank: Bank, marginReqType: MarginRequirementType): { assets: BigNumber; liabilities: BigNumber } {
    return {
      assets: bank.getAssetUsdValue(this.assetShares, marginReqType, PriceBias.None),
      liabilities: bank.getLiabilityUsdValue(this.liabilityShares, marginReqType, PriceBias.None),
    };
  }

  public getUsdValueWithPriceBias(
    bank: Bank,
    marginReqType: MarginRequirementType
  ): { assets: BigNumber; liabilities: BigNumber } {
    return {
      assets: bank.getAssetUsdValue(this.assetShares, marginReqType, PriceBias.Lowest),
      liabilities: bank.getLiabilityUsdValue(this.liabilityShares, marginReqType, PriceBias.Highest),
    };
  }

  public getQuantity(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return {
      assets: bank.getAssetQuantity(this.assetShares),
      liabilities: bank.getLiabilityQuantity(this.liabilityShares),
    };
  }

  public getQuantityUi(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return {
      assets: new BigNumber(nativeToUi(bank.getAssetQuantity(this.assetShares), bank.mintDecimals)),
      liabilities: new BigNumber(nativeToUi(bank.getLiabilityQuantity(this.liabilityShares), bank.mintDecimals)),
    };
  }
}

// On-chain types

export interface MarginfiAccountData {
  group: PublicKey;
  authority: PublicKey;
  lendingAccount: { balances: BalanceData[] };
}

export interface BalanceData {
  active: boolean;
  bankPk: PublicKey;
  assetShares: WrappedI80F48;
  liabilityShares: WrappedI80F48;
}

export enum MarginRequirementType {
  Init = 0,
  Maint = 1,
  Equity = 2,
}

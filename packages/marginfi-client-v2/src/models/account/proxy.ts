import { Amount, DEFAULT_COMMITMENT, InstructionsWrapper, shortenAddress } from "@mrgnlabs/mrgn-common";
import { Address, BorshCoder, translateAddress } from "@project-serum/anchor";
import { AccountMeta, Commitment, PublicKey, Transaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { MarginfiClient, MarginfiGroup } from "../..";
import { MARGINFI_IDL } from "../../idl";
import { AccountType, MarginfiConfig, MarginfiProgram } from "../../types";
import { MarginfiAccount, MarginRequirementType, MarginfiAccountRaw } from "./pure";
import { Bank } from "../bank";
import { Balance } from "../balance";

class MarginfiAccountProxy {
  public readonly address: PublicKey;

  private _marginfiAccount: MarginfiAccount;

  // --------------------------------------------------------------------------
  // Factories
  // --------------------------------------------------------------------------

  /**
   * @internal
   */
  private constructor(marginfiAccountPk: PublicKey, private readonly client: MarginfiClient, marginfiAccount: MarginfiAccount) {
    this.address = marginfiAccountPk;
    this._marginfiAccount = marginfiAccount;
  }

  static async fetch(
    marginfiAccountPk: Address,
    client: MarginfiClient,
    commitment?: Commitment
  ): Promise<MarginfiAccountProxy> {
    const { config, program } = client;
    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    const accountData = await MarginfiAccountProxy._fetchAccountData(_marginfiAccountPk, config, program, commitment);
    const marginfiAccount = new MarginfiAccount(_marginfiAccountPk, accountData);

    const marginfiAccountProxy = new MarginfiAccountProxy(_marginfiAccountPk, client, marginfiAccount);

    require("debug")("mfi:margin-account")("Loaded marginfi account %s", _marginfiAccountPk);

    return marginfiAccountProxy;
  }

  static fromAccountParsed(marginfiAccountPk: Address, client: MarginfiClient, accountData: MarginfiAccountRaw) {
    if (!accountData.group.equals(client.config.groupPk))
      throw Error(
        `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`
      );

    const _marginfiAccountPk = translateAddress(marginfiAccountPk);
    const marginfiAccount = new MarginfiAccount(_marginfiAccountPk, accountData);
    return new MarginfiAccountProxy(_marginfiAccountPk, client, marginfiAccount);
  }

  static fromAccountDataRaw(marginfiAccountPk: PublicKey, client: MarginfiClient, marginfiAccountRawData: Buffer) {
    const marginfiAccountData = MarginfiAccountProxy.decode(marginfiAccountRawData);
    return MarginfiAccountProxy.fromAccountParsed(marginfiAccountPk, client, marginfiAccountData);
  }

  // --------------------------------------------------------------------------
  // Attributes
  // --------------------------------------------------------------------------

  get authority(): PublicKey {
    return this._marginfiAccount.authority;
  }

  get group(): MarginfiGroup {
    return this.client.group;
  }

  get balances(): Balance[] {
    return this._marginfiAccount.balances;
  }

  get data(): MarginfiAccount {
    return this._marginfiAccount;
  }

  /** @internal */
  private get _program() {
    return this.client.program;
  }

  /** @internal */
  private get _config() {
    return this.client.config;
  }

  get activeBalances(): Balance[] {
    return this._marginfiAccount.balances.filter((la) => la.active);
  }

  public getBalance(bankPk: PublicKey): Balance {
    return this._marginfiAccount.getBalance(bankPk);
  }

  public canBeLiquidated(): boolean {
    const { assets, liabilities } = this._marginfiAccount.computeHealthComponents(
      this.client.banks,
      this.client.priceInfos,
      MarginRequirementType.Maintenance
    );

    return assets.lt(liabilities);
  }

  public computeHealthComponents(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponents(this.client.banks, this.client.priceInfos, marginRequirement);
  }

  public computeFreeCollateral(opts?: { clamped?: boolean }): BigNumber {
    return this._marginfiAccount.computeFreeCollateral(this.client.banks, this.client.priceInfos, opts);
  }

  public computeHealthComponentsWithoutBias(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponentsWithoutBias(
      this.client.banks,
      this.client.priceInfos,
      marginRequirement
    );
  }

  public computeMaxBorrowForBank(bankAddress: PublicKey): BigNumber {
    return this._marginfiAccount.computeMaxBorrowForBank(this.client.banks, this.client.priceInfos, bankAddress);
  }

  public computeMaxWithdrawForBank(bankAddress: PublicKey, opts?: { volatilityFactor?: number }): BigNumber {
    return this._marginfiAccount.computeMaxWithdrawForBank(this.client.banks, this.client.priceInfos, bankAddress, opts);
  }

  public computeMaxLiquidatableAssetAmount(assetBankAddress: PublicKey, liabilityBankAddress: PublicKey): BigNumber {
    return this._marginfiAccount.computeMaxLiquidatableAssetAmount(
      this.client.banks,
      this.client.priceInfos,
      assetBankAddress,
      liabilityBankAddress
    );
  }

  public computeNetApy(): number {
    return this._marginfiAccount.computeNetApy(this.client.banks, this.client.priceInfos);
  }

  // --------------------------------------------------------------------------
  // User actions
  // --------------------------------------------------------------------------

  async makeDepositIx(amount: Amount, bankAddress: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeDepositIxForAccount(this._program, this.client.banks, amount, bankAddress);
  }

  async deposit(amount: Amount, bankAddress: PublicKey): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:deposit`);
    debug("Depositing %s into marginfi account (bank: %s)", amount, shortenAddress(bankAddress));
    const ixs = await this.makeDepositIx(amount, bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Depositing successful %s", sig);
    return sig;
  }

  async makeRepayIx(amount: Amount, bankAddress: PublicKey, repayAll: boolean = false): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeRepayIxForAccount(this._program, this.client.banks, amount, bankAddress, repayAll);
  }

  async repay(amount: Amount, bankAddress: PublicKey, repayAll: boolean = false): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug("Repaying %s into marginfi account (bank: %s), repay all: %s", amount, bankAddress, repayAll);
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Depositing successful %s", sig);

    return sig;
  }

  async makeWithdrawIx(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeWithdrawIxForAccount(
      this._program,
      this.client.banks,
      amount,
      bankAddress,
      withdrawAll
    );
  }

  async withdraw(amount: Amount, bankAddress: PublicKey, withdrawAll: boolean = false): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw`);
    debug("Withdrawing %s from marginfi account", amount);
    const ixs = await this.makeWithdrawIx(amount, bankAddress, withdrawAll);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Withdrawing successful %s", sig);
    return sig;
  }

  async makeBorrowIx(
    amount: Amount,
    bankAddress: PublicKey,
    opt?: { remainingAccountsBankOverride?: Bank[] } | undefined
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeBorrowIxForAccount(this._program, this.client.banks, amount, bankAddress, opt);
  }

  async borrow(amount: Amount, bankAddress: PublicKey): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:borrow`);
    debug("Borrowing %s from marginfi account", amount);
    const ixs = await this.makeBorrowIx(amount, bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Borrowing successful %s", sig);
    return sig;
  }

  async makeWithdrawEmissionsIx(bankAddress: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeWithdrawEmissionsIxForAccount(this._program, this.client.banks, bankAddress);
  }

  async withdrawEmissions(bankAddress: PublicKey): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw-emissions`);
    debug("Withdrawing emission from marginfi account (bank: %s)", bankAddress);
    const ixs = await this.makeWithdrawEmissionsIx(bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Withdrawing emission successful %s", sig);
    return sig;
  }

  public async makeLendingAccountLiquidateIx(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabBankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeLendingAccountLiquidateIxForAccount(
      liquidateeMarginfiAccount,
      this._program,
      this.client.banks,
      assetBankAddress,
      assetQuantityUi,
      liabBankAddress
    );
  }

  public async lendingAccountLiquidate(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabBankAddress: PublicKey
  ): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:liquidation`);
    debug("Liquidating marginfi account %s", liquidateeMarginfiAccount.address.toBase58());
    const ixw = await this.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      assetBankAddress,
      assetQuantityUi,
      liabBankAddress
    );
    const tx = new Transaction().add(...ixw.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Liquidation successful %s", sig);
    return sig;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  getHealthCheckAccounts(mandatoryBanks: Bank[] = [], excludedBanks: Bank[] = []): AccountMeta[] {
    return this._marginfiAccount.getHealthCheckAccounts(this.client.banks, mandatoryBanks, excludedBanks);
  }

  private static async _fetchAccountData(
    accountAddress: Address,
    config: MarginfiConfig,
    program: MarginfiProgram,
    commitment?: Commitment
  ): Promise<MarginfiAccountRaw> {
    const mergedCommitment = commitment ?? program.provider.connection.commitment ?? DEFAULT_COMMITMENT;

    const data: MarginfiAccountRaw = (await program.account.marginfiAccount.fetch(
      accountAddress,
      mergedCommitment
    )) as any;

    if (!data.group.equals(config.groupPk))
      throw Error(`Marginfi account tied to group ${data.group.toBase58()}. Expected: ${config.groupPk.toBase58()}`);

    return data;
  }

  static decode(encoded: Buffer): MarginfiAccountRaw {
    const coder = new BorshCoder(MARGINFI_IDL);
    return coder.accounts.decode(AccountType.MarginfiAccount, encoded);
  }

  static async encode(decoded: MarginfiAccountRaw): Promise<Buffer> {
    const coder = new BorshCoder(MARGINFI_IDL);
    return await coder.accounts.encode(AccountType.MarginfiAccount, decoded);
  }

  async reload() {
    require("debug")(`mfi:margin-account:${this.address.toBase58().toString()}:loader`)("Reloading account data");
    const marginfiAccountAi = await this._program.account.marginfiAccount.getAccountInfo(this.address);
    if (!marginfiAccountAi) throw new Error(`Failed to fetch data for marginfi account ${this.address.toBase58()}`);
    const marginfiAccountParsed = MarginfiAccountProxy.decode(marginfiAccountAi.data);
    if (!marginfiAccountParsed.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountParsed.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );

    this._updateFromAccountParsed(marginfiAccountParsed);
  }

  private _updateFromAccountParsed(data: MarginfiAccountRaw) {
    this._marginfiAccount = new MarginfiAccount(this.address, data);
  }

  public toString() {
    const { assets, liabilities } = this.computeHealthComponents(MarginRequirementType.Equity);

    let str = `-----------------
  Marginfi account:
    Address: ${this.address.toBase58()}
    Group: ${this.client.groupAddress.toBase58()}
    Authority: ${this.authority.toBase58()}
    Equity: ${this.computeHealthComponents(MarginRequirementType.Equity).assets.toFixed(6)}
    Equity: ${assets.minus(liabilities).toFixed(6)}
    Assets: ${assets.toFixed(6)},
    Liabilities: ${liabilities.toFixed(6)}`;

    if (this.activeBalances.length > 0) {
      str = str.concat("\n-----------------\nBalances:");
    }
    for (let balance of this.activeBalances) {
      const bank = this.client.getBankByPk(balance.bankPk);
      if (!bank) {
        console.log(`Bank ${balance.bankPk} not found`);
        continue;
      }
      const priceInfo = this.client.getPriceInfoByBank(balance.bankPk);
      if (!priceInfo) {
        console.log(`Price info for bank ${balance.bankPk} not found`);
        continue;
      }
      const utpStr = `\n  Bank ${balance.bankPk.toBase58()}:
      Mint: ${bank.mint.toBase58()}
      Equity: ${balance.computeUsdValue(bank, priceInfo, MarginRequirementType.Equity)}`;
      str = str.concat(utpStr);
    }

    return str;
  }

  public describe(): string {
    const { assets, liabilities } = this.computeHealthComponents(MarginRequirementType.Equity);
    return `
- Marginfi account: ${this.address}
- Total deposits: $${assets.toFixed(6)}
- Total liabilities: $${liabilities.toFixed(6)}
- Equity: $${assets.minus(liabilities).toFixed(6)}
- Health: ${assets.minus(liabilities).div(assets).times(100).toFixed(2)}%
- Balances:  ${this.activeBalances.map((balance) => {
      const bank = this.client.getBankByPk(balance.bankPk)!;
      const priceInfo = this.client.getPriceInfoByBank(balance.bankPk)!;
      return balance.describe(bank, priceInfo);
    })}`;
  }
}

export { MarginfiAccountProxy };

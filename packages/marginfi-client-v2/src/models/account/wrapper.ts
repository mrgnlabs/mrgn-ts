import { Amount, DEFAULT_COMMITMENT, InstructionsWrapper, Wallet, shortenAddress } from "@mrgnlabs/mrgn-common";
import { Address, BorshCoder, translateAddress } from "@coral-xyz/anchor";
import {
  AccountMeta,
  Commitment,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { MarginfiClient, MarginfiGroup } from "../..";
import { MARGINFI_IDL } from "../../idl";
import { AccountType, MarginfiConfig, MarginfiProgram } from "../../types";
import { MarginfiAccount, MarginRequirementType, MarginfiAccountRaw } from "./pure";
import { Bank } from "../bank";
import { Balance } from "../balance";

export interface SimulationResult {
  banks: Map<string, Bank>;
  marginfiAccount: MarginfiAccountWrapper;
}

class MarginfiAccountWrapper {
  public readonly address: PublicKey;

  private _marginfiAccount: MarginfiAccount;

  // --------------------------------------------------------------------------
  // Factories
  // --------------------------------------------------------------------------

  /**
   * @internal
   */
  private constructor(
    marginfiAccountPk: PublicKey,
    private readonly client: MarginfiClient,
    marginfiAccount: MarginfiAccount
  ) {
    this.address = marginfiAccountPk;
    this._marginfiAccount = marginfiAccount;
  }

  static async fetch(
    marginfiAccountPk: Address,
    client: MarginfiClient,
    commitment?: Commitment
  ): Promise<MarginfiAccountWrapper> {
    const { config, program } = client;
    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    const accountData = await MarginfiAccountWrapper._fetchAccountData(_marginfiAccountPk, config, program, commitment);
    const marginfiAccount = new MarginfiAccount(_marginfiAccountPk, accountData);

    const marginfiAccountProxy = new MarginfiAccountWrapper(_marginfiAccountPk, client, marginfiAccount);

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
    return new MarginfiAccountWrapper(_marginfiAccountPk, client, marginfiAccount);
  }

  static fromAccountDataRaw(marginfiAccountPk: PublicKey, client: MarginfiClient, marginfiAccountRawData: Buffer) {
    const marginfiAccountData = MarginfiAccountWrapper.decode(marginfiAccountRawData);
    return MarginfiAccountWrapper.fromAccountParsed(marginfiAccountPk, client, marginfiAccountData);
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
      this.client.oraclePrices,
      MarginRequirementType.Maintenance
    );

    return assets.lt(liabilities);
  }

  public computeHealthComponents(
    marginRequirement: MarginRequirementType,
    excludedBanks: PublicKey[] = []
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponents(
      this.client.banks,
      this.client.oraclePrices,
      marginRequirement,
      excludedBanks
    );
  }

  public computeFreeCollateral(opts?: { clamped?: boolean }): BigNumber {
    return this._marginfiAccount.computeFreeCollateral(this.client.banks, this.client.oraclePrices, opts);
  }

  public computeHealthComponentsWithoutBias(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponentsWithoutBias(
      this.client.banks,
      this.client.oraclePrices,
      marginRequirement
    );
  }

  public computeMaxBorrowForBank(bankAddress: PublicKey, opts?: { volatilityFactor?: number }): BigNumber {
    return this._marginfiAccount.computeMaxBorrowForBank(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress,
      opts
    );
  }

  public computeMaxWithdrawForBank(bankAddress: PublicKey, opts?: { volatilityFactor?: number }): BigNumber {
    return this._marginfiAccount.computeMaxWithdrawForBank(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress,
      opts
    );
  }

  public computeMaxLiquidatableAssetAmount(assetBankAddress: PublicKey, liabilityBankAddress: PublicKey): BigNumber {
    return this._marginfiAccount.computeMaxLiquidatableAssetAmount(
      this.client.banks,
      this.client.oraclePrices,
      assetBankAddress,
      liabilityBankAddress
    );
  }

  public computeLiquidationPriceForBank(bankAddress: PublicKey): number | null {
    return this._marginfiAccount.computeLiquidationPriceForBank(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress
    );
  }

  public computeLiquidationPriceForBankAmount(
    bankAddress: PublicKey,
    isLending: boolean,
    amount: number
  ): number | null {
    return this._marginfiAccount.computeLiquidationPriceForBankAmount(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress,
      isLending,
      amount
    );
  }

  public computeNetApy(): number {
    return this._marginfiAccount.computeNetApy(this.client.banks, this.client.oraclePrices);
  }

  makePriorityFeeIx(priorityFee?: number): TransactionInstruction[] {
    const priorityFeeIx: TransactionInstruction[] = [];
    if (!priorityFee || priorityFee < 0) return priorityFeeIx;

    priorityFeeIx.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1_000_000,
      })
    );

    priorityFeeIx.push(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: priorityFee * LAMPORTS_PER_SOL,
      })
    );

    return priorityFeeIx;
  }

  // --------------------------------------------------------------------------
  // User actions
  // --------------------------------------------------------------------------

  async makeDepositIx(amount: Amount, bankAddress: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeDepositIx(this._program, this.client.banks, amount, bankAddress);
  }

  async deposit(amount: Amount, bankAddress: PublicKey, priorityFee?: number): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:deposit`);
    debug("Depositing %s into marginfi account (bank: %s)", amount, shortenAddress(bankAddress));
    const priorityFeeIx = this.makePriorityFeeIx(priorityFee);
    const ixs = await this.makeDepositIx(amount, bankAddress);
    const tx = new Transaction().add(...priorityFeeIx, ...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Depositing successful %s", sig);
    return sig;
  }

  async simulateDeposit(amount: Amount, bankAddress: PublicKey): Promise<SimulationResult> {
    const ixs = await this.makeDepositIx(amount, bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    const [mfiAccountData, bankData] = await this.client.simulateTransaction(tx, [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate deposit");
    const previewBanks = this.client.banks;
    previewBanks.set(bankAddress.toBase58(), Bank.fromBuffer(bankAddress, bankData));
    const previewClient = new MarginfiClient(
      this._config,
      this.client.program,
      {} as Wallet,
      true,
      this.client.group,
      this.client.banks,
      this.client.oraclePrices
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      this.address,
      previewClient,
      mfiAccountData
    );
    return {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  }

  async makeRepayIx(amount: Amount, bankAddress: PublicKey, repayAll: boolean = false): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeRepayIx(this._program, this.client.banks, amount, bankAddress, repayAll);
  }

  async repay(
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    priorityFee?: number
  ): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug("Repaying %s into marginfi account (bank: %s), repay all: %s", amount, bankAddress, repayAll);
    const priorityFeeIx = this.makePriorityFeeIx(priorityFee);
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll);
    const tx = new Transaction().add(...priorityFeeIx, ...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Depositing successful %s", sig);

    return sig;
  }

  async simulateRepay(amount: Amount, bankAddress: PublicKey, repayAll: boolean = false): Promise<SimulationResult> {
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll);
    const tx = new Transaction().add(...ixs.instructions);
    const [mfiAccountData, bankData] = await this.client.simulateTransaction(tx, [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate repay");
    const previewBanks = this.client.banks;
    previewBanks.set(bankAddress.toBase58(), Bank.fromBuffer(bankAddress, bankData));
    const previewClient = new MarginfiClient(
      this._config,
      this.client.program,
      {} as Wallet,
      true,
      this.client.group,
      this.client.banks,
      this.client.oraclePrices
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      this.address,
      previewClient,
      mfiAccountData
    );
    return {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  }

  async makeWithdrawIx(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeWithdrawIx(this._program, this.client.banks, amount, bankAddress, withdrawAll);
  }

  async withdraw(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    priorityFee?: number
  ): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw`);
    debug("Withdrawing %s from marginfi account", amount);
    const priorityFeeIx = this.makePriorityFeeIx(priorityFee);
    const ixs = await this.makeWithdrawIx(amount, bankAddress, withdrawAll);
    const tx = new Transaction().add(...priorityFeeIx, ...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Withdrawing successful %s", sig);
    return sig;
  }

  async simulateWithdraw(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false
  ): Promise<SimulationResult> {
    const ixs = await this.makeWithdrawIx(amount, bankAddress, withdrawAll);
    const tx = new Transaction().add(...ixs.instructions);
    const [mfiAccountData, bankData] = await this.client.simulateTransaction(tx, [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate withdraw");
    const previewBanks = this.client.banks;
    previewBanks.set(bankAddress.toBase58(), Bank.fromBuffer(bankAddress, bankData));
    const previewClient = new MarginfiClient(
      this._config,
      this.client.program,
      {} as Wallet,
      true,
      this.client.group,
      this.client.banks,
      this.client.oraclePrices
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      this.address,
      previewClient,
      mfiAccountData
    );
    return {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  }

  async makeBorrowIx(
    amount: Amount,
    bankAddress: PublicKey,
    opt?: { remainingAccountsBankOverride?: Bank[] } | undefined
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeBorrowIx(this._program, this.client.banks, amount, bankAddress, opt);
  }

  async borrow(amount: Amount, bankAddress: PublicKey, priorityFee?: number): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:borrow`);
    debug("Borrowing %s from marginfi account", amount);
    const priorityFeeIx = this.makePriorityFeeIx(priorityFee);
    const ixs = await this.makeBorrowIx(amount, bankAddress);
    const tx = new Transaction().add(...priorityFeeIx, ...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Borrowing successful %s", sig);
    return sig;
  }

  async simulateBorrow(amount: Amount, bankAddress: PublicKey): Promise<SimulationResult> {
    const ixs = await this.makeBorrowIx(amount, bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    const [mfiAccountData, bankData] = await this.client.simulateTransaction(tx, [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate borrow");
    const previewBanks = this.client.banks;
    previewBanks.set(bankAddress.toBase58(), Bank.fromBuffer(bankAddress, bankData));
    const previewClient = new MarginfiClient(
      this._config,
      this.client.program,
      {} as Wallet,
      true,
      this.client.group,
      this.client.banks,
      this.client.oraclePrices
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      this.address,
      previewClient,
      mfiAccountData
    );
    return {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  }

  async makeWithdrawEmissionsIx(bankAddress: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeWithdrawEmissionsIx(this._program, this.client.banks, bankAddress);
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
    return this._marginfiAccount.makeLendingAccountLiquidateIx(
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
    const marginfiAccountParsed = MarginfiAccountWrapper.decode(marginfiAccountAi.data);
    if (!marginfiAccountParsed.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountParsed.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );

    this._updateFromAccountParsed(marginfiAccountParsed);
  }

  private _updateFromAccountParsed(data: MarginfiAccountRaw) {
    this._marginfiAccount = new MarginfiAccount(this.address, data);
  }

  public describe(): string {
    return this._marginfiAccount.describe(this.client.banks, this.client.oraclePrices);
  }
}

export { MarginfiAccountWrapper };

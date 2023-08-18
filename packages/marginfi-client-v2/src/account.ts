import {
  Amount,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  DEFAULT_COMMITMENT,
  InstructionsWrapper,
  NATIVE_MINT,
  nativeToUi,
  uiToNative,
  WrappedI80F48,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";
import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import {
  AccountMeta,
  Commitment,
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { MarginfiClient } from ".";
import { Bank, PriceBias } from "./bank";
import MarginfiGroup from "./group";
import { MARGINFI_IDL } from "./idl";
import instructions from "./instructions";
import { AccountType, MarginfiConfig, MarginfiProgram } from "./types";
import {
  computeFreeCollateral,
  computeHealthComponents,
  computeHealthComponentsWithoutBias,
  computeMaxBorrowForBank,
  computeMaxLiquidatableAssetAmount,
  computeMaxWithdrawForBank,
  computeNetApy,
  getBalance,
} from "./lib/math/account";

/**
 * Wrapper class around a specific marginfi account.
 */
export class MarginfiAccount {
  public readonly publicKey: PublicKey;

  private _group: MarginfiGroup;
  private _authority: PublicKey;
  private _lendingBalances: Balance[];

  // --------------------------------------------------------------------------
  // Factories
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Attributes
  // --------------------------------------------------------------------------

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

  /** @internal */
  private get _program() {
    return this.client.program;
  }

  /** @internal */
  private get _config() {
    return this.client.config;
  }

  /**
   * Marginfi group address
   */
  get activeBalances(): Balance[] {
    return this._lendingBalances.filter((la) => la.active);
  }

  public getBalance(bankPk: PublicKey): Balance {
    return getBalance(this.activeBalances, bankPk);
  }

  public canBeLiquidated(): boolean {
    const { assets, liabilities } = computeHealthComponents(
      this.activeBalances,
      this.group.banks,
      MarginRequirementType.Maint
    );

    return assets.lt(liabilities);
  }

  public computeHealthComponents(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeHealthComponents(this.activeBalances, this.group.banks, marginRequirement);
  }

  public computeFreeCollateral(opts?: { clamped?: boolean }): BigNumber {
    return computeFreeCollateral(this.activeBalances, this.group.banks, opts);
  }

  public computeHealthComponentsWithoutBias(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeHealthComponentsWithoutBias(this.activeBalances, this.group.banks, marginRequirement);
  }

  public computeMaxBorrowForBank(bankAddress: PublicKey): BigNumber {
    return computeMaxBorrowForBank(this.activeBalances, this.group.banks, bankAddress);
  }

  public computeMaxWithdrawForBank(bankAddress: PublicKey, opts?: { volatilityFactor?: number }): BigNumber {
    return computeMaxWithdrawForBank(this.activeBalances, this.group.banks, bankAddress, opts);
  }

  public computeMaxLiquidatableAssetAmount(assetBankAddress: PublicKey, liabilityBankAddress: PublicKey): BigNumber {
    return computeMaxLiquidatableAssetAmount(
      this.activeBalances,
      this.group.banks,
      assetBankAddress,
      liabilityBankAddress
    );
  }

  public computeNetApy(): number {
    return computeNetApy(this.activeBalances, this.group.banks);
  }

  // --------------------------------------------------------------------------
  // User actions
  // --------------------------------------------------------------------------

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

    return {
      instructions: bank.mint.equals(NATIVE_MINT) ? await this.wrapInstructionForWSol(ix, amount) : [ix],
      keys: [],
    };
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
    const sig = await this.client.processTransaction(tx, []);
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

    return {
      instructions: bank.mint.equals(NATIVE_MINT) ? await this.wrapInstructionForWSol(ix, amount) : [ix],
      keys: [],
    };
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

    let ixs = [];

    if (this.activeBalances.length >= 4) {
      ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    }

    if (repayAll && !bank.emissionsMint.equals(PublicKey.default)) {
      const userAta = await associatedAddress({
        mint: bank.emissionsMint,
        owner: this.client.provider.wallet.publicKey,
      });
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.client.provider.wallet.publicKey,
        userAta,
        this.client.provider.wallet.publicKey,
        bank.emissionsMint
      );

      ixs.push(createAtaIdempotentIx);
      ixs.push(...(await this.makeWithdrawEmissionsIx(bank)).instructions);
    }

    const ixws = await this.makeRepayIx(amount, bank, repayAll);
    ixs.push(...ixws.instructions);

    const tx = new Transaction().add(...ixs);
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

    return { instructions: bank.mint.equals(NATIVE_MINT) ? await this.wrapInstructionForWSol(ix) : [ix], keys: [] };
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

    let ixs = [];

    if (this.activeBalances.length >= 4) {
      ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    }

    if (withdrawAll && !bank.emissionsMint.equals(PublicKey.default)) {
      const userAta = await associatedAddress({
        mint: bank.emissionsMint,
        owner: this.client.provider.wallet.publicKey,
      });
      const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
        this.client.provider.wallet.publicKey,
        userAta,
        this.client.provider.wallet.publicKey,
        bank.emissionsMint
      );

      ixs.push(createAtaIdempotentIx);
      ixs.push(...(await this.makeWithdrawEmissionsIx(bank)).instructions);
    }

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
    ixs.push(createAtaIdempotentIx);

    const ixw = await this.makeWithdrawIx(amount, bank, withdrawAll);
    ixs.push(...ixw.instructions);

    const tx = new Transaction().add(...ixs);
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
  async makeBorrowIx(
    amount: Amount,
    bank: Bank,
    opt?: { remainingAccountsBankOverride?: Bank[] } | undefined
  ): Promise<InstructionsWrapper> {
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });

    const remainingAccounts = this.getHealthCheckAccounts(
      (opt?.remainingAccountsBankOverride?.length ?? 0) > 0 ? opt?.remainingAccountsBankOverride : [bank]
    );

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

    return { instructions: bank.mint.equals(NATIVE_MINT) ? await this.wrapInstructionForWSol(ix) : [ix], keys: [] };
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

    let ixs = [];

    if (this.activeBalances.length >= 4) {
      ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
    }

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
    ixs.push(createAtaIdempotentIx);

    const ixw = await this.makeBorrowIx(amount, bank);
    ixs.push(...ixw.instructions);

    const tx = new Transaction().add(...ixs);
    const sig = await this.client.processTransaction(tx);
    debug("Borrowing successful %s", sig);
    await this.reload();
    return sig;
  }

  async makeWithdrawEmissionsIx(bank: Bank): Promise<InstructionsWrapper> {
    const userAta = await associatedAddress({
      mint: bank.emissionsMint,
      owner: this.client.provider.wallet.publicKey,
    });
    const ix = await instructions.makelendingAccountWithdrawEmissionIx(this._program, {
      marginfiGroup: this.group.publicKey,
      marginfiAccount: this.publicKey,
      signer: this.client.provider.wallet.publicKey,
      bank: bank.publicKey,
      destinationTokenAccount: userAta,
      emissionsMint: bank.emissionsMint,
    });

    return { instructions: [ix], keys: [] };
  }

  async withdrawEmissions(bank: Bank): Promise<string> {
    const tx = new Transaction();
    const userAta = await associatedAddress({
      mint: bank.emissionsMint,
      owner: this.client.provider.wallet.publicKey,
    });
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.client.provider.wallet.publicKey,
      userAta,
      this.client.provider.wallet.publicKey,
      bank.emissionsMint
    );

    tx.add(createAtaIdempotentIx);
    tx.add(...(await this.makeWithdrawEmissionsIx(bank)).instructions);

    const sig = await this.client.processTransaction(tx);
    await this.reload();
    return sig;
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

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

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
    const marginfiAccountAi = await this._program.account.marginfiAccount.getAccountInfo(this.publicKey);
    if (!marginfiAccountAi) throw new Error(`Failed to fetch data for marginfi account ${this.publicKey.toBase58()}`);
    const marginfiAccountData = MarginfiAccount.decode(marginfiAccountAi.data);
    if (!marginfiAccountData.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountData.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );

    this._group.reload();
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

  public toString() {
    const { assets, liabilities } = this.computeHealthComponents(MarginRequirementType.Equity);

    let str = `-----------------
  Marginfi account:
    Address: ${this.publicKey.toBase58()}
    Group: ${this.group.publicKey.toBase58()}
    Authority: ${this.authority.toBase58()}
    Equity: ${this.computeHealthComponents(MarginRequirementType.Equity).assets.toFixed(6)}
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
      const utpStr = `\n  Bank ${bank.publicKey.toBase58()}:
      Mint: ${bank.mint.toBase58()}
      Equity: ${lendingAccount.getUsdValue(bank, MarginRequirementType.Equity)}`;
      str = str.concat(utpStr);
    }

    return str;
  }

  public describe(): string {
    const { assets, liabilities } = this.computeHealthComponents(MarginRequirementType.Equity);
    return `
- Marginfi account: ${this.publicKey}
- Total deposits: $${assets.toFixed(6)}
- Total liabilities: $${liabilities.toFixed(6)}
- Equity: $${assets.minus(liabilities).toFixed(6)}
- Health: ${assets.minus(liabilities).div(assets).times(100).toFixed(2)}%
- Balances:  ${this.activeBalances.map((la) => {
      const bank = this._group.getBankByPk(la.bankPk)!;
      return la.describe(bank);
    })}`;
  }

  private async wrapInstructionForWSol(
    ix: TransactionInstruction,
    amount: Amount = new BigNumber(0)
  ): Promise<TransactionInstruction[]> {
    const debug = require("debug")("mfi:wrapInstructionForWSol");
    debug("creating a wsol account, and minting %s wsol", amount);
    return [...(await this.makeWrapSolIxs(new BigNumber(amount))), ix, await this.makeUnwrapSolIx()];
  }

  private async makeWrapSolIxs(amount: BigNumber): Promise<TransactionInstruction[]> {
    const address = await associatedAddress({ mint: NATIVE_MINT, owner: this.client.wallet.publicKey });
    const ixs = [
      createAssociatedTokenAccountIdempotentInstruction(
        this.client.wallet.publicKey,
        address,
        this.client.wallet.publicKey,
        NATIVE_MINT
      ),
    ];

    if (amount.gt(0)) {
      const debug = require("debug")("mfi:wrapInstructionForWSol");
      const nativeAmount = uiToNative(amount, 9).toNumber() + 10000;
      debug("wrapping %s wsol", nativeAmount);

      ixs.push(
        SystemProgram.transfer({ fromPubkey: this.client.wallet.publicKey, toPubkey: address, lamports: nativeAmount }),
        createSyncNativeInstruction(address)
      );
    }

    return ixs;
  }

  private async makeUnwrapSolIx(): Promise<TransactionInstruction> {
    const address = await associatedAddress({ mint: NATIVE_MINT, owner: this.client.wallet.publicKey });

    return createCloseAccountInstruction(address, this.client.wallet.publicKey, this.client.wallet.publicKey);
  }
}

export default MarginfiAccount;

// Client types

export class Balance {
  active: boolean;
  bankPk: PublicKey;
  assetShares: BigNumber;
  liabilityShares: BigNumber;
  emissionsOutstanding: BigNumber;
  lastUpdate: number;

  constructor(data: BalanceData) {
    this.active = data.active;
    this.bankPk = data.bankPk;
    this.assetShares = wrappedI80F48toBigNumber(data.assetShares);
    this.liabilityShares = wrappedI80F48toBigNumber(data.liabilityShares);
    this.emissionsOutstanding = wrappedI80F48toBigNumber(data.emissionsOutstanding);
    this.lastUpdate = data.lastUpdate;
  }

  public static newEmpty(bankPk: PublicKey): Balance {
    return new Balance({
      active: false,
      bankPk,
      assetShares: { value: new BN(0) },
      liabilityShares: { value: new BN(0) },
      emissionsOutstanding: { value: new BN(0) },
      lastUpdate: 0,
    });
  }

  public getUsdValue(
    bank: Bank,
    marginReqType: MarginRequirementType = MarginRequirementType.Equity
  ): { assets: BigNumber; liabilities: BigNumber } {
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

  public getTotalOutstandingEmissions(bank: Bank): BigNumber {
    const claimedEmissions = this.emissionsOutstanding;

    const unclaimedEmissions = this.calcClaimedEmissions(bank, Date.now() / 1000);

    return claimedEmissions.plus(unclaimedEmissions);
  }

  private calcClaimedEmissions(bank: Bank, currentTimestamp: number): BigNumber {
    const lendingActive = bank.emissionsActiveLending;
    const borrowActive = bank.emissionsActiveBorrowing;

    const { assets, liabilities } = this.getQuantity(bank);

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

  public describe(bank: Bank): string {
    let { assets: assetsQt, liabilities: liabsQt } = this.getQuantityUi(bank);
    let { assets: assetsUsd, liabilities: liabsUsd } = this.getUsdValue(bank, MarginRequirementType.Equity);

    return `
${bank.publicKey} Balance:
- Deposits: ${assetsQt.toFixed(5)} (${assetsUsd.toFixed(5)} USD)
- Borrows: ${liabsQt.toFixed(5)} (${liabsUsd.toFixed(5)} USD)
`;
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
  emissionsOutstanding: WrappedI80F48;
  lastUpdate: number;
}

export enum MarginRequirementType {
  Init = 0,
  Maint = 1,
  Equity = 2,
}

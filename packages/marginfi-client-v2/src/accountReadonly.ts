import { Address, BorshCoder, translateAddress } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import { AccountInfo, Cluster, Commitment, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Balance, MarginfiAccountData, MarginRequirementType } from "./account";
import { Bank, BankData, getOraclePriceData } from "./bank";
import MarginfiClientReadonly from "./clientReadonly";
import MarginfiGroup from "./group";
import { MARGINFI_IDL } from "./idl";
import { AccountType, MarginfiConfig, MarginfiProgram } from "./types";
import { DEFAULT_COMMITMENT, shortenAddress } from "@mrgnlabs/mrgn-common";

/**
 * Wrapper class around a specific marginfi account.
 */
class MarginfiAccountReadonly {
  public readonly publicKey: PublicKey;

  private _group: MarginfiGroup;
  private _authority: PublicKey;
  private _lendingAccount: Balance[];

  /**
   * @internal
   */
  private constructor(
    marginfiAccountPk: PublicKey,
    readonly client: MarginfiClientReadonly,
    group: MarginfiGroup,
    rawData: MarginfiAccountData
  ) {
    this.publicKey = marginfiAccountPk;

    this._group = group;
    this._authority = rawData.authority;

    this._lendingAccount = rawData.lendingAccount.balances.map((la) => new Balance(la));
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
  get activeBalances(): Balance[] {
    return this._lendingAccount.filter((la) => la.active);
  }

  get group(): MarginfiGroup {
    return this._group;
  }

  /**
   * Marginfi group address
   */
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
    client: MarginfiClientReadonly,
    commitment?: Commitment
  ): Promise<MarginfiAccountReadonly> {
    const { config, program } = client;
    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    const accountData = await MarginfiAccountReadonly._fetchAccountData(
      _marginfiAccountPk,
      config,
      program,
      commitment
    );

    const marginfiAccount = new MarginfiAccountReadonly(
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
    client: MarginfiClientReadonly,
    accountData: MarginfiAccountData,
    marginfiGroup: MarginfiGroup
  ) {
    if (!accountData.group.equals(client.config.groupPk))
      throw Error(
        `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`
      );

    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    return new MarginfiAccountReadonly(_marginfiAccountPk, client, marginfiGroup, accountData);
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
    client: MarginfiClientReadonly,
    marginfiAccountRawData: Buffer,
    marginfiGroup: MarginfiGroup
  ) {
    const marginfiAccountData = MarginfiAccountReadonly.decode(marginfiAccountRawData);

    return MarginfiAccountReadonly.fromAccountData(marginfiAccountPk, client, marginfiAccountData, marginfiGroup);
  }

  // --- Others

  /**
   * Fetch marginfi account data.
   * Check sanity against provided config.
   *
   * @param accountAddress accountAddress Address of the target account
   * @param config marginfi config
   * @param program marginfi Anchor program
   * @param commitment Commitment level override
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
    require("debug")(`mfi:margin-account:${this.publicKey.toString()}:loader`)("Reloading account data");
    const [marginfiGroupAi, marginfiAccountAi] = await this.loadGroupAndAccountAi();
    const marginfiAccountData = MarginfiAccountReadonly.decode(marginfiAccountAi.data);
    if (!marginfiAccountData.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountData.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );

    const bankAccountsData = await this._program.account.bank.all([
      { memcmp: { offset: 8 + 32 + 1, bytes: this._config.groupPk.toBase58() } },
    ]);

    const banks = await Promise.all(
      bankAccountsData.map(async (accountData) => {
        let bankData = accountData.account as any as BankData;
        return new Bank(
          this._config.banks.find((b) => b.address.equals(accountData.publicKey))?.label || "Unknown",
          accountData.publicKey,
          bankData,
          await getOraclePriceData(
            this._program.provider.connection,
            bankData.config.oracleSetup,
            bankData.config.oracleKeys
          )
        );
      })
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

    this._lendingAccount = data.lendingAccount.balances.map((la) => new Balance(la));
  }

  private async loadGroupAndAccountAi(): Promise<AccountInfo<Buffer>[]> {
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

  // Calculate the max withdraw of a lending account balance.
  // max_withdraw = max(free_collateral, balance_deposit) + max(free_collateral - balance_deposit, 0) / balance_liab_weight
  public getMaxWithdrawForBank(_bank: Bank): BigNumber {
    // TODO

    return new BigNumber(0);
  }
}

export default MarginfiAccountReadonly;

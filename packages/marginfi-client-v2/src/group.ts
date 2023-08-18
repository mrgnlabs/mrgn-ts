import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { Commitment, PublicKey } from "@solana/web3.js";
import { Bank, BankData, parseOraclePriceData } from "./bank";
import { MARGINFI_IDL } from "./idl";
import { AccountType, MarginfiConfig, MarginfiProgram } from "./types";

/**
 * Wrapper class around a specific marginfi group.
 */
class MarginfiGroup {
  public readonly publicKey: PublicKey;

  private _program: MarginfiProgram;
  private _config: MarginfiConfig;

  private _admin: PublicKey;
  private _banks: Map<string, Bank>;

  /**
   * @internal
   */
  private constructor(config: MarginfiConfig, program: MarginfiProgram, rawData: MarginfiGroupData, banks: Bank[]) {
    this.publicKey = config.groupPk;
    this._config = config;
    this._program = program;

    this._admin = rawData.admin;
    this._banks = banks.reduce((acc, current) => {
      acc.set(current.publicKey.toBase58(), current);
      return acc;
    }, new Map<string, Bank>());
  }

  // --- Getters / Setters

  /**
   * Marginfi account authority address
   */
  get admin(): PublicKey {
    return this._admin;
  }

  get banks(): Map<string, Bank> {
    return this._banks;
  }

  // --- Factories

  /**
   * MarginfiGroup network factory
   *
   * Fetch account data according to the config and instantiate the corresponding MarginfiGroup.
   *
   * @param config marginfi config
   * @param program marginfi Anchor program
   * @param commitment Commitment level override
   * @return MarginfiGroup instance
   */
  static async fetch(config: MarginfiConfig, program: MarginfiProgram, commitment?: Commitment) {
    const debug = require("debug")(`mfi:margin-group`);
    debug("Loading Marginfi Group %s", config.groupPk);
    const { data, banks } = await MarginfiGroup.fetchData(program, config.groupPk, commitment);
    return new MarginfiGroup(config, program, data, banks);
  }

  /**
   * MarginfiGroup local factory (decoded)
   *
   * Instantiate a MarginfiGroup according to the provided decoded data.
   * Check sanity against provided config.
   *
   * @param config marginfi config
   * @param program marginfi Anchor program
   * @param accountData Decoded marginfi group data
   * @param banks Asset banks
   * @return MarginfiGroup instance
   */
  static fromAccountData(
    config: MarginfiConfig,
    program: MarginfiProgram,
    accountData: MarginfiGroupData,
    banks: Bank[]
  ) {
    return new MarginfiGroup(config, program, accountData, banks);
  }

  /**
   * MarginfiGroup local factory (encoded)
   *
   * Instantiate a MarginfiGroup according to the provided encoded data.
   * Check sanity against provided config.
   *
   * @param config marginfi config
   * @param program marginfi Anchor program
   * @param rawData Encoded marginfi group data
   * @param banks Asset banks
   * @return MarginfiGroup instance
   */
  static fromAccountDataRaw(config: MarginfiConfig, program: MarginfiProgram, rawData: Buffer, banks: Bank[]) {
    const data = MarginfiGroup.decode(rawData);
    return MarginfiGroup.fromAccountData(config, program, data, banks);
  }

  // --- Others

  /**
   * Decode marginfi group account data according to the Anchor IDL.
   *
   * @param encoded Raw data buffer
   * @return Decoded marginfi group account data struct
   */
  static decode(encoded: Buffer): MarginfiGroupData {
    const coder = new BorshCoder(MARGINFI_IDL);
    return coder.accounts.decode(AccountType.MarginfiGroup, encoded);
  }

  /**
   * Encode marginfi group account data according to the Anchor IDL.
   *
   * @param decoded Encoded marginfi group account data buffer
   * @return Raw data buffer
   */
  static async encode(decoded: MarginfiGroupData): Promise<Buffer> {
    const coder = new BorshCoder(MARGINFI_IDL);
    return await coder.accounts.encode(AccountType.MarginfiGroup, decoded);
  }

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  async reload(commitment?: Commitment) {
    const { data, banks } = await MarginfiGroup.fetchData(this._program, this.publicKey, commitment);
    const banksMap = banks.reduce((acc, current) => {
      acc.set(current.publicKey.toBase58(), current);
      return acc;
    }, new Map<string, Bank>());
    this._admin = data.admin;
    this._banks = banksMap;
  }

  // NOTE: 2 RPC calls
  static async fetchData(
    program: MarginfiProgram,
    groupAddress: PublicKey,
    commitment?: Commitment
  ): Promise<{ data: MarginfiGroupData; banks: Bank[] }> {
    // Fetch & shape all accounts of Bank type (~ bank discobery, )
    let bankAccountsData = await program.account.bank.all([
      { memcmp: { offset: 8 + 32 + 1, bytes: groupAddress.toBase58() } },
    ]);
    const bankDatasKeyed = bankAccountsData.map((account) => ({
      address: account.publicKey,
      data: account.account as any as BankData,
    }));

    // Batch-fetch the group account and all the oracle accounts as per the banks retrieved above
    const [groupAi, ...priceFeedAis] = await program.provider.connection.getMultipleAccountsInfo(
      [groupAddress, ...bankDatasKeyed.map((b) => b.data.config.oracleKeys[0])],
      commitment
    ); // NOTE: This will break if/when we start having more than 1 oracle key per bank

    // Unpack raw data for group and oracles, and build the `Bank`s map
    if (!groupAi) throw new Error("Failed to fetch the on-chain group data");
    const groupData = await MarginfiGroup.decode(groupAi.data);
    const banks = bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
      const priceDataRaw = priceFeedAis[index];
      if (!priceDataRaw) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
      const priceData = parseOraclePriceData(bankData.config.oracleSetup, priceDataRaw.data);
      return new Bank(bankAddress, bankData, priceData);
    }, new Map<string, Bank>());

    return {
      data: groupData,
      banks,
    };
  }

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  getBankByPk(publicKey: Address): Bank | null {
    let _publicKey = translateAddress(publicKey);
    return this._banks.get(_publicKey.toString()) ?? null;
  }

  getBankByMint(mint: Address): Bank | null {
    const _mint = translateAddress(mint);
    return [...this._banks.values()].find((bank) => bank.mint.equals(_mint)) ?? null;
  }
}

export default MarginfiGroup;

// On-chain types

export interface MarginfiGroupData {
  admin: PublicKey;
  reservedSpace: BN[];
}

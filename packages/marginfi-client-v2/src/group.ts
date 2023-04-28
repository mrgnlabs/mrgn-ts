import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import { Cluster, Commitment, PublicKey } from "@solana/web3.js";
import { Bank, BankData, getOraclePriceData } from "./bank";
import { MARGINFI_IDL } from "./idl";
import { AccountType, MarginfiConfig, MarginfiProgram } from "./types";
import { DEFAULT_COMMITMENT } from "@mrgnlabs/mrgn-common";

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

    const accountData = await MarginfiGroup._fetchAccountData(config, program, commitment);

    const bankAccountsData = (await program.account.bank.all([{ memcmp: { offset: 8 + 32 + 1, bytes: config.groupPk.toBase58() } }]));

    const banks = await Promise.all(
      bankAccountsData.map(async (accountData) => {
        let bankData = accountData.account as any as BankData;
        return new Bank(
          config.banks.find((b) => b.address.equals(accountData.publicKey))?.label || "Unknown",
          accountData.publicKey,
          bankData,
          await getOraclePriceData(program.provider.connection, bankData.config.oracleSetup, bankData.config.oracleKeys)
        );
      })
    );


    return new MarginfiGroup(config, program, accountData, banks);
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
   * Fetch marginfi group account data according to the config.
   * Check sanity against provided config.
   *
   * @param config marginfi config
   * @param program marginfi Anchor program
   * @param commitment Commitment level override
   * @return Decoded marginfi group account data struct
   */
  private static async _fetchAccountData(
    config: MarginfiConfig,
    program: MarginfiProgram,
    commitment?: Commitment
  ): Promise<MarginfiGroupData> {
    const mergedCommitment = commitment ?? program.provider.connection.commitment ?? DEFAULT_COMMITMENT;

    return (await program.account.marginfiGroup.fetch(config.groupPk, mergedCommitment)) as any;
  }

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
    const rawData = await MarginfiGroup._fetchAccountData(this._config, this._program, commitment);

    const bankAddresses = this._config.banks.map((b) => b.address);

    let bankAccountsData = await this._program.account.bank.all([
      { memcmp: { offset: 8 + 32 + 1, bytes: this._config.groupPk.toBase58() } },
    ]);

    let nullAccounts = [];
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] === null) nullAccounts.push(bankAddresses[i]);
    }
    if (nullAccounts.length > 0) {
      throw Error(`Failed to fetch banks ${nullAccounts}`);
    }

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

    this._admin = rawData.admin;
    this._banks = banks.reduce((acc, current) => {
      acc.set(current.publicKey.toBase58(), current);
      return acc;
    }, new Map<string, Bank>());
  }

  /**
   * Get bank by label.
   */
  getBankByLabel(label: string): Bank | null {
    return [...this._banks.values()].find((bank) => bank.label === label) ?? null;
  }

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  getBankByPk(publicKey: Address): Bank | null {
    let _publicKey = translateAddress(publicKey);
    return this._banks.get(_publicKey.toString()) ?? null;
  }

  getBankByMint(mint: PublicKey): Bank | null {
    return [...this._banks.values()].find((bank) => bank.mint.equals(mint)) ?? null;
  }
}

export default MarginfiGroup;

// On-chain types

export interface MarginfiGroupData {
  admin: PublicKey;
  reservedSpace: BN[];
}

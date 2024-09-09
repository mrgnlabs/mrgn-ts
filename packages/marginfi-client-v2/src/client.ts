import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  AddressLookupTableAccount,
  Commitment,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { AccountType, Environment, MarginfiConfig, MarginfiProgram } from "./types";
import { getConfig } from "./config";
import instructions from "./instructions";
import { MarginRequirementType } from "./models/account";
import {
  BankMetadataMap,
  chunkedGetRawMultipleAccountInfoOrdered,
  DEFAULT_COMMITMENT,
  DEFAULT_CONFIRM_OPTS,
  InstructionsWrapper,
  loadBankMetadatas,
  loadKeypair,
  NodeWallet,
  simulateBundle,
  sleep,
  TransactionOptions,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { MarginfiGroup } from "./models/group";
import {
  BankRaw,
  parseOracleSetup,
  parsePriceInfo,
  Bank,
  OraclePrice,
  ADDRESS_LOOKUP_TABLE_FOR_GROUP,
  MarginfiAccountRaw,
  MARGINFI_IDL,
  MarginfiIdlType,
  BankConfigOpt,
  BankConfig,
  makeBundleTipIx,
} from ".";
import { MarginfiAccountWrapper } from "./models/account/wrapper";
import {
  ProcessTransactionError,
  ProcessTransactionErrorType,
  parseErrorFromLogs,
  parseTransactionError,
} from "./errors";
import { findOracleKey, makePriorityFeeIx, PythPushFeedIdMap, buildFeedIdMap } from "./utils";

export type BankMap = Map<string, Bank>;
export type OraclePriceMap = Map<string, OraclePrice>;
export type MintDataMap = Map<string, MintData>;

export type MintData = {
  mint: PublicKey;
  tokenProgram: PublicKey;
  feeBps: number; // TODO: Handle this in calcs
  emissionTokenProgram: PublicKey | null;
};

export type MarginfiClientOptions = {
  confirmOpts?: ConfirmOptions;
  readOnly?: boolean;
  preloadedBankAddresses?: PublicKey[];
  bundleSimRpcEndpoint?: string;
  fetchGroupDataOverride?: (
    program: MarginfiProgram,
    groupAddress: PublicKey,
    commitment?: Commitment,
    bankAddresses?: PublicKey[],
    bankMetadataMap?: BankMetadataMap
  ) => Promise<{
    marginfiGroup: MarginfiGroup;
    banks: Map<string, Bank>;
    priceInfos: Map<string, OraclePrice>;
    tokenDatas: Map<string, MintData>;
    feedIdMap: PythPushFeedIdMap;
  }>;
};

/**
 * Entrypoint to interact with the marginfi contract.
 */
class MarginfiClient {
  public group: MarginfiGroup;
  public banks: BankMap;
  public oraclePrices: OraclePriceMap;
  public mintDatas: MintDataMap;
  public addressLookupTables: AddressLookupTableAccount[];
  public feedIdMap: PythPushFeedIdMap;
  private preloadedBankAddresses?: PublicKey[];
  private bundleSimRpcEndpoint: string;

  // --------------------------------------------------------------------------
  // Factories
  // --------------------------------------------------------------------------

  constructor(
    readonly config: MarginfiConfig,
    readonly program: MarginfiProgram,
    readonly wallet: Wallet,
    readonly isReadOnly: boolean,
    group: MarginfiGroup,
    banks: BankMap,
    priceInfos: OraclePriceMap,
    mintDatas: MintDataMap,
    feedIdMap: PythPushFeedIdMap,
    addressLookupTables?: AddressLookupTableAccount[],
    preloadedBankAddresses?: PublicKey[],
    readonly bankMetadataMap?: BankMetadataMap,
    bundleSimRpcEndpoint?: string
  ) {
    this.group = group;
    this.banks = banks;
    this.oraclePrices = priceInfos;
    this.mintDatas = mintDatas;
    this.addressLookupTables = addressLookupTables ?? [];
    this.preloadedBankAddresses = preloadedBankAddresses;
    this.feedIdMap = feedIdMap;
    this.bundleSimRpcEndpoint = bundleSimRpcEndpoint ?? program.provider.connection.rpcEndpoint;
  }

  /**
   * MarginfiClient factory
   *
   * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
   *
   * @param config marginfi config
   * @param wallet User wallet (used to pay fees and sign transactions)
   * @param connection Solana web.js Connection object
   * @returns MarginfiClient instance
   */
  static async fetch(
    config: MarginfiConfig,
    wallet: Wallet,
    connection: Connection,
    clientOptions?: MarginfiClientOptions
  ) {
    const debug = require("debug")("mfi:client");
    debug(
      "Loading Marginfi Client\n\tprogram: %s\n\tenv: %s\n\tgroup: %s\n\turl: %s",
      config.programId,
      config.environment,
      config.groupPk,
      connection.rpcEndpoint
    );

    const confirmOpts = clientOptions?.confirmOpts ?? {};
    const readOnly = clientOptions?.readOnly ?? false;
    const preloadedBankAddresses = clientOptions?.preloadedBankAddresses;

    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...confirmOpts,
    });

    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: config.programId.toBase58() };

    const program = new Program(idl, provider) as any as MarginfiProgram;

    let bankMetadataMap: BankMetadataMap | undefined = undefined;
    try {
      bankMetadataMap = await loadBankMetadatas();
    } catch (error) {
      console.error("Failed to load bank metadatas. Convenience getter by symbol will not be available", error);
    }

    const fetchGroupData = clientOptions?.fetchGroupDataOverride ?? MarginfiClient.fetchGroupData;

    const { marginfiGroup, banks, priceInfos, tokenDatas, feedIdMap } = await fetchGroupData(
      program,
      config.groupPk,
      connection.commitment,
      preloadedBankAddresses,
      bankMetadataMap
    );

    let addressLookupTableAddresses = ADDRESS_LOOKUP_TABLE_FOR_GROUP[config.groupPk.toString()];

    if (!addressLookupTableAddresses) {
      try {
        const response = await fetch(`https://storage.googleapis.com/mrgn-public/mrgn-lut-cache.json`, {
          headers: {
            Accept: "application/json",
          },
          method: "GET",
        });

        if (response.status === 200) {
          const parsedResponse = await response.json();
          if (!parsedResponse) throw new Error("JSON is mia");
          const lookupTableString = parsedResponse[config.groupPk.toString()];
          if (!parsedResponse) throw new Error("Group not found");
          addressLookupTableAddresses = [new PublicKey(lookupTableString)];
        } else {
          throw new Error("LUT not found");
        }
      } catch (error) {
        addressLookupTableAddresses = [];
      }
    }

    debug("Fetching address lookup tables for %s", addressLookupTableAddresses);
    const addressLookupTables = (
      await Promise.all(addressLookupTableAddresses.map((address) => connection.getAddressLookupTable(address)))
    )
      .map((response) => response!.value)
      .filter((table) => table !== null) as AddressLookupTableAccount[];

    return new MarginfiClient(
      config,
      program,
      wallet,
      readOnly,
      marginfiGroup,
      banks,
      priceInfos,
      tokenDatas,
      feedIdMap,
      addressLookupTables,
      preloadedBankAddresses,
      bankMetadataMap
    );
  }

  static async fromEnv(
    overrides?: Partial<{
      env: Environment;
      connection: Connection;
      programId: Address;
      marginfiGroup: Address;
      wallet: Wallet;
    }>
  ): Promise<MarginfiClient> {
    const debug = require("debug")("mfi:client");
    const env = overrides?.env ?? (process.env.MARGINFI_ENV! as Environment);
    const connection =
      overrides?.connection ??
      new Connection(process.env.MARGINFI_RPC_ENDPOINT!, {
        commitment: DEFAULT_COMMITMENT,
      });
    const programId = overrides?.programId ?? new PublicKey(process.env.MARGINFI_PROGRAM!);
    const groupPk =
      overrides?.marginfiGroup ??
      (process.env.MARGINFI_GROUP ? new PublicKey(process.env.MARGINFI_GROUP) : PublicKey.default);
    const wallet =
      overrides?.wallet ??
      new NodeWallet(
        process.env.MARGINFI_WALLET_KEY
          ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.MARGINFI_WALLET_KEY)))
          : loadKeypair(process.env.MARGINFI_WALLET!)
      );

    debug("Loading the marginfi client from env vars");
    debug("Env: %s\nProgram: %s\nGroup: %s\nSigner: %s", env, programId, groupPk, wallet.publicKey);

    const config = getConfig(env, {
      groupPk: translateAddress(groupPk),
      programId: translateAddress(programId),
    });

    return MarginfiClient.fetch(config, wallet, connection, {
      confirmOpts: {
        commitment: connection.commitment,
      },
    });
  }

  // NOTE: 2 RPC calls
  // Pass in bankAddresses to skip the gpa call
  static async fetchGroupData(
    program: MarginfiProgram,
    groupAddress: PublicKey,
    commitment?: Commitment,
    bankAddresses?: PublicKey[],
    bankMetadataMap?: BankMetadataMap
  ): Promise<{
    marginfiGroup: MarginfiGroup;
    banks: Map<string, Bank>;
    priceInfos: Map<string, OraclePrice>;
    tokenDatas: Map<string, MintData>;
    feedIdMap: PythPushFeedIdMap;
  }> {
    const debug = require("debug")("mfi:client");
    // Fetch & shape all accounts of Bank type (~ bank discovery)
    let bankDatasKeyed: { address: PublicKey; data: BankRaw }[] = [];
    if (bankAddresses && bankAddresses.length > 0) {
      debug("Using preloaded bank addresses, skipping gpa call", bankAddresses.length, "banks");
      let bankAccountsData = await program.account.bank.fetchMultiple(bankAddresses);
      for (let i = 0; i < bankAccountsData.length; i++) {
        if (bankAccountsData[i] !== null) {
          bankDatasKeyed.push({
            address: bankAddresses[i],
            data: bankAccountsData[i] as any as BankRaw,
          });
        }
      }
    } else {
      let bankAccountsData = await program.account.bank.all([
        { memcmp: { offset: 8 + 32 + 1, bytes: groupAddress.toBase58() } },
      ]);
      bankDatasKeyed = bankAccountsData.map((account: any) => ({
        address: account.publicKey,
        data: account.account as any as BankRaw,
      }));
    }

    const feedIdMap = await buildFeedIdMap(
      bankDatasKeyed.map((b) => b.data.config),
      program.provider.connection
    );

    // const oracleKeys = bankDatasKeyed.map((b) => b.data.config.oracleKeys[0]);
    const mintKeys = bankDatasKeyed.map((b) => b.data.mint);
    const emissionMintKeys = bankDatasKeyed
      .map((b) => b.data.emissionsMint)
      .filter((pk) => !pk.equals(PublicKey.default)) as PublicKey[];
    const oracleKeys = bankDatasKeyed.map((b) => findOracleKey(BankConfig.fromAccountParsed(b.data.config), feedIdMap));
    // Batch-fetch the group account and all the oracle accounts as per the banks retrieved above
    const allAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
      groupAddress.toBase58(),
      ...oracleKeys.map((pk) => pk.toBase58()),
      ...mintKeys.map((pk) => pk.toBase58()),
      ...emissionMintKeys.map((pk) => pk.toBase58()),
    ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank

    const groupAi = allAis.shift();
    const oracleAis = allAis.splice(0, oracleKeys.length);
    const mintAis = allAis.splice(0, mintKeys.length);
    const emissionMintAis = allAis.splice(0);

    // Unpack raw data for group and oracles, and build the `Bank`s map
    if (!groupAi) throw new Error("Failed to fetch the on-chain group data");
    const marginfiGroup = MarginfiGroup.fromBuffer(groupAddress, groupAi.data, program.idl);

    const banks = new Map(
      bankDatasKeyed.map(({ address, data }) => {
        const bankMetadata = bankMetadataMap ? bankMetadataMap[address.toBase58()] : undefined;
        const bank = Bank.fromAccountParsed(address, data, feedIdMap, bankMetadata);

        return [address.toBase58(), bank];
      })
    );

    const tokenDatas = new Map(
      bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
        const mintAddress = mintKeys[index];
        const mintDataRaw = mintAis[index];
        if (!mintDataRaw) throw new Error(`Failed to fetch mint account for bank ${bankAddress.toBase58()}`);
        let emissionTokenProgram: PublicKey | null = null;
        if (!bankData.emissionsMint.equals(PublicKey.default)) {
          const emissionMintDataRawIndex = emissionMintKeys.findIndex((pk) => pk.equals(bankData.emissionsMint));
          emissionTokenProgram = emissionMintDataRawIndex >= 0 ? emissionMintAis[emissionMintDataRawIndex].owner : null;
        }
        // TODO: parse extension data to see if there is a fee
        return [
          bankAddress.toBase58(),
          { mint: mintAddress, tokenProgram: mintDataRaw.owner, feeBps: 0, emissionTokenProgram },
        ];
      })
    );

    const priceInfos = new Map(
      bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
        const priceDataRaw = oracleAis[index];
        if (!priceDataRaw) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
        const oracleSetup = parseOracleSetup(bankData.config.oracleSetup);
        return [bankAddress.toBase58(), parsePriceInfo(oracleSetup, priceDataRaw.data)];
      })
    );

    debug("Fetched %s banks and %s price feeds", banks.size, priceInfos.size);

    return {
      marginfiGroup,
      banks,
      priceInfos,
      tokenDatas,
      feedIdMap,
    };
  }

  async reload() {
    const { marginfiGroup, banks, priceInfos } = await MarginfiClient.fetchGroupData(
      this.program,
      this.config.groupPk,
      this.program.provider.connection.commitment,
      this.preloadedBankAddresses
    );
    this.group = marginfiGroup;
    this.banks = banks;
    this.oraclePrices = priceInfos;
  }

  // --------------------------------------------------------------------------
  // Attributes
  // --------------------------------------------------------------------------

  get groupAddress(): PublicKey {
    return this.config.groupPk;
  }

  get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  get programId(): PublicKey {
    return this.program.programId;
  }

  async getAllMarginfiAccountPubkeys(): Promise<PublicKey[]> {
    return (
      await this.provider.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              bytes: this.config.groupPk.toBase58(),
              offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
            },
          },
        ],
        dataSlice: { offset: 0, length: 0 },
      })
    ).map((a) => a.pubkey);
  }

  /**
   * Fetches multiple marginfi accounts based on an array of public keys using the getMultipleAccounts RPC call.
   *
   * @param pubkeys - The public keys of the marginfi accounts to fetch.
   * @returns An array of MarginfiAccountWrapper instances.
   */
  async getMultipleMarginfiAccounts(pubkeys: PublicKey[]): Promise<MarginfiAccountWrapper[]> {
    require("debug")("mfi:client")("Fetching %s marginfi accounts", pubkeys);

    const accounts = await this.program.account.marginfiAccount.fetchMultiple(pubkeys);
    return accounts.map((account, index) => {
      if (!account) {
        throw new Error(`Account not found for pubkey: ${pubkeys[index].toBase58()}`);
      }
      return MarginfiAccountWrapper.fromAccountParsed(pubkeys[index], this, account);
    });
  }

  /**
   * Retrieves the addresses of all marginfi accounts in the underlying group.
   *
   * @returns Account addresses
   */
  async getAllMarginfiAccountAddresses(): Promise<PublicKey[]> {
    return (
      await this.program.provider.connection.getProgramAccounts(this.programId, {
        commitment: this.program.provider.connection.commitment,
        dataSlice: {
          offset: 0,
          length: 0,
        },
        filters: [
          {
            memcmp: {
              bytes: this.groupAddress.toBase58(),
              offset: 8, // marginfiGroup is the second field in the account after the authority, so offset by the discriminant and a pubkey
            },
          },
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(
                new BorshAccountsCoder(this.program.idl).accountDiscriminator(AccountType.MarginfiAccount)
              ),
            },
          },
        ],
      })
    ).map((a) => a.pubkey);
  }

  /**
   * Retrieves all marginfi accounts under the specified authority.
   *
   * @returns MarginfiAccount instances
   */
  async getMarginfiAccountsForAuthority(authority?: Address): Promise<MarginfiAccountWrapper[]> {
    const _authority = authority ? translateAddress(authority) : this.provider.wallet.publicKey;

    const marginfiAccounts = (
      await this.program.account.marginfiAccount.all([
        {
          memcmp: {
            bytes: this.groupAddress.toBase58(),
            offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
          },
        },
        {
          memcmp: {
            bytes: _authority.toBase58(),
            offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
          },
        },
      ])
    ).map((a) => MarginfiAccountWrapper.fromAccountParsed(a.publicKey, this, a.account as MarginfiAccountRaw));

    marginfiAccounts.sort((accountA, accountB) => {
      const assetsValueA = accountA.computeHealthComponents(MarginRequirementType.Equity).assets;
      const assetsValueB = accountB.computeHealthComponents(MarginRequirementType.Equity).assets;

      if (assetsValueA.eq(assetsValueB)) return 0;
      return assetsValueA.gt(assetsValueB) ? -1 : 1;
    });

    return marginfiAccounts;
  }

  /**
   * Retrieves the addresses of all accounts owned by the marginfi program.
   *
   * @returns Account addresses
   */
  async getAllProgramAccountAddresses(type: AccountType): Promise<PublicKey[]> {
    return (
      await this.program.provider.connection.getProgramAccounts(this.programId, {
        commitment: this.program.provider.connection.commitment,
        dataSlice: {
          offset: 0,
          length: 0,
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(
                new BorshAccountsCoder(this.program.idl).accountDiscriminator(AccountType.MarginfiAccount)
              ),
            },
          },
        ],
      })
    ).map((a) => a.pubkey);
  }

  getBankByPk(bankAddress: Address): Bank | null {
    let _bankAddress = translateAddress(bankAddress);
    return this.banks.get(_bankAddress.toString()) ?? null;
  }

  getBankByMint(mint: Address): Bank | null {
    const _mint = translateAddress(mint);
    return [...this.banks.values()].find((bank) => bank.mint.equals(_mint)) ?? null;
  }

  getBankByTokenSymbol(tokenSymbol: string): Bank | null {
    if (tokenSymbol === undefined) return null;
    return [...this.banks.values()].find((bank) => bank.tokenSymbol === tokenSymbol) ?? null;
  }

  getOraclePriceByBank(bankAddress: Address): OraclePrice | null {
    let _bankAddress = translateAddress(bankAddress);
    return this.oraclePrices.get(_bankAddress.toString()) ?? null;
  }
  // --------------------------------------------------------------------------
  // User actions
  // --------------------------------------------------------------------------

  /**
   * Create transaction instruction to create a new marginfi account under the authority of the user.
   *
   * @returns transaction instruction
   */
  async makeCreateMarginfiAccountIx(marginfiAccountPk: PublicKey): Promise<InstructionsWrapper> {
    const dbg = require("debug")("mfi:client");

    dbg("Generating marginfi account ix for %s", marginfiAccountPk);

    const initMarginfiAccountIx = await instructions.makeInitMarginfiAccountIx(this.program, {
      marginfiGroupPk: this.groupAddress,
      marginfiAccountPk,
      authorityPk: this.provider.wallet.publicKey,
      feePayerPk: this.provider.wallet.publicKey,
    });

    const ixs = [initMarginfiAccountIx];

    return {
      instructions: ixs,
      keys: [],
    };
  }

  /**
   * Create a new marginfi account under the authority of the user.
   *
   * @returns MarginfiAccount instance
   */
  async createMarginfiAccount(
    opts?: TransactionOptions,
    createOpts?: { newAccountKey?: PublicKey | undefined }
  ): Promise<MarginfiAccountWrapper> {
    const dbg = require("debug")("mfi:client");

    const accountKeypair = Keypair.generate();
    const newAccountKey = createOpts?.newAccountKey ?? accountKeypair.publicKey;

    const bundleTipIx = makeBundleTipIx(this.provider.publicKey);
    const ixs = await this.makeCreateMarginfiAccountIx(newAccountKey);
    const signers = [...ixs.keys];
    // If there was no newAccountKey provided, we need to sign with the ephemeraKeypair we generated.
    if (!createOpts?.newAccountKey) signers.push(accountKeypair);

    const tx = new Transaction().add(bundleTipIx, ...ixs.instructions);
    const sig = await this.processTransaction(tx, signers, opts);

    dbg("Created Marginfi account %s", sig);

    return opts?.dryRun || createOpts?.newAccountKey
      ? Promise.resolve(undefined as unknown as MarginfiAccountWrapper)
      : MarginfiAccountWrapper.fetch(newAccountKey, this, opts?.commitment);
  }

  /**
   * Create transaction instruction to initialize a new group.
   *
   * @returns transaction instruction
   */
  async makeCreateMarginfiGroupIx(marginfiGroup: PublicKey): Promise<InstructionsWrapper> {
    const dbg = require("debug")("mfi:client");

    dbg("Generating group init ix");

    const initGroupIx = await instructions.makeGroupInitIx(this.program, {
      marginfiGroup: marginfiGroup,
      admin: this.provider.wallet.publicKey,
    });

    const ixs = [initGroupIx];

    return {
      instructions: ixs,
      keys: [],
    };
  }

  /**
   * Create a new marginfi bank under the authority of the user.
   *
   * @returns String signature
   */
  async createPermissionlessBank({
    mint,
    bankConfig,
    group,
    admin,
    seed,
    priorityFee,
    opts,
  }: {
    mint: PublicKey;
    bankConfig: BankConfigOpt;
    group: PublicKey;
    admin: PublicKey;
    seed?: Keypair;
    priorityFee?: number;

    opts?: TransactionOptions;
  }) {
    const dbg = require("debug")("mfi:client");

    const keypair = seed ?? Keypair.generate();

    const priorityFeeIx = priorityFee ? makePriorityFeeIx(priorityFee) : [];

    const bankIxs = await this.group.makePoolAddBankIx(this.program, keypair.publicKey, mint, bankConfig, {
      admin,
      groupAddress: group,
    });

    const signers = [...bankIxs.keys, keypair];

    const tx = new Transaction().add(...priorityFeeIx, ...bankIxs.instructions);

    const sig = await this.processTransaction(tx, signers, opts);
    dbg("Created Marginfi group %s", sig);

    return sig;
  }

  /**
   * Create a new marginfi group under the authority of the user.
   *
   * @returns MarginfiGroup instance
   */
  async createMarginfiGroup(
    seed?: Keypair,
    additionalIxs?: TransactionInstruction[],
    opts?: TransactionOptions
  ): Promise<PublicKey> {
    const dbg = require("debug")("mfi:client");

    const accountKeypair = seed ?? Keypair.generate();

    const ixs = await this.makeCreateMarginfiGroupIx(accountKeypair.publicKey);
    const signers = [...ixs.keys, accountKeypair];
    const tx = new Transaction().add(...ixs.instructions, ...(additionalIxs ?? []));
    const sig = await this.processTransaction(tx, signers, opts);
    dbg("Created Marginfi group %s", sig);

    return Promise.resolve(accountKeypair.publicKey);
  }

  /**
   * Create a new lending pool.
   *
   * @returns bank address and transaction signature
   */
  async createLendingPool(
    bankMint: PublicKey,
    bankConfig: BankConfigOpt,
    opts?: TransactionOptions
  ): Promise<{ bankAddress: PublicKey; signature: TransactionSignature }> {
    const dbg = require("debug")("mfi:client");

    const bankKeypair = Keypair.generate();

    const ixs = await this.group.makePoolAddBankIx(this.program, bankKeypair.publicKey, bankMint, bankConfig, {});
    const signers = [...ixs.keys, bankKeypair];
    const priorityFeeIx = makePriorityFeeIx(0.001);

    const tx = new Transaction().add(...priorityFeeIx, ...ixs.instructions);

    const sig = await this.processTransaction(tx, signers, opts);
    dbg("Created new lending pool %s", sig);

    return Promise.resolve({
      bankAddress: bankKeypair.publicKey,
      signature: sig,
    });
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Process a transaction, sign it and send it to the network.
   *
   * @throws ProcessTransactionError
   */
  async processTransactions(
    transaction: VersionedTransaction[],
    signers?: Array<Signer>,
    opts?: TransactionOptions
  ): Promise<TransactionSignature[]> {
    let signatures: TransactionSignature[] = [""];

    let versionedTransactions: VersionedTransaction[] = transaction;
    const connection = new Connection(this.provider.connection.rpcEndpoint, this.provider.opts);
    let minContextSlot: number;
    let blockhash: string;
    let lastValidBlockHeight: number;

    try {
      const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext();

      minContextSlot = getLatestBlockhashAndContext.context.slot - 4;
      blockhash = getLatestBlockhashAndContext.value.blockhash;
      lastValidBlockHeight = getLatestBlockhashAndContext.value.lastValidBlockHeight;

      if (versionedTransactions.length === 0) throw new Error();

      // only signers for last tx
      if (signers) versionedTransactions[versionedTransactions.length - 1].sign(signers);
    } catch (error: any) {
      console.log("Failed to build the transaction", error);
      throw new ProcessTransactionError(error.message, ProcessTransactionErrorType.TransactionBuildingError);
    }

    try {
      if (opts?.dryRun || this.isReadOnly) {
        const response = await simulateBundle(this.bundleSimRpcEndpoint, versionedTransactions);
        console.log(
          response.value.err ? `❌ Error: ${response.value.err}` : `✅ Success - ${response.value.unitsConsumed} CU`
        );
        console.log("------ Logs 👇 ------");
        if (response.value.logs) {
          for (const log of response.value.logs) {
            console.log(log);
          }
        }

        if (response.value.err)
          throw new SendTransactionError({
            action: "simulate",
            signature: "",
            transactionMessage: JSON.stringify(response.value.err),
            logs: response.value.logs ?? [],
          });
        return [];
      } else {
        let base58Txs: string[] = [];

        if (!!this.wallet.signAllTransactions) {
          versionedTransactions = await this.wallet.signAllTransactions(versionedTransactions);
          base58Txs = versionedTransactions.map((signedTx) => bs58.encode(signedTx.serialize()));
        } else {
          for (let i = 0; i < versionedTransactions.length; i++) {
            const signedTx = await this.wallet.signTransaction(versionedTransactions[i]);
            const base58Tx = bs58.encode(signedTx.serialize());
            base58Txs.push(base58Tx);
            versionedTransactions[i] = signedTx;
          }
        }

        let mergedOpts: ConfirmOptions = {
          ...DEFAULT_CONFIRM_OPTS,
          commitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
          preflightCommitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
          minContextSlot,
          ...opts,
        };

        const response = await simulateBundle(this.bundleSimRpcEndpoint, versionedTransactions).catch((error) => {
          throw new SendTransactionError({
            action: "simulate",
            signature: "",
            transactionMessage: JSON.stringify(error),
            logs: [],
          });
        });

        if (response.value.err) {
          throw new SendTransactionError({
            action: "simulate",
            signature: "",
            transactionMessage: JSON.stringify(response.value.err),
            logs: response.value.logs ?? [],
          });
        }

        signatures = await this.sendTransactionAsBundle(base58Txs).catch(
          async () =>
            await Promise.all(
              versionedTransactions.map(async (versionedTransaction) => {
                const signature = await connection.sendTransaction(versionedTransaction, {
                  // minContextSlot: mergedOpts.minContextSlot,
                  skipPreflight: mergedOpts.skipPreflight,
                  preflightCommitment: mergedOpts.preflightCommitment,
                  maxRetries: mergedOpts.maxRetries,
                });
                return signature;
              })
            )
        );

        await Promise.all(
          signatures.map(async (signature) => {
            await connection.confirmTransaction(
              {
                blockhash,
                lastValidBlockHeight,
                signature,
              },
              mergedOpts.commitment
            );
          })
        );
      }
      return signatures;
    } catch (error: any) {
      const parsedError = parseTransactionError(error, this.config.programId);

      if (error?.logs?.length > 0) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
        if (parsedError) {
          console.log("Parsed:", parsedError);
          throw new ProcessTransactionError(
            parsedError.description,
            ProcessTransactionErrorType.SimulationError,
            error.logs,
            parsedError.programId
          );
        }
      }
      console.log("fallthrough error", error);
      throw new ProcessTransactionError(
        parsedError?.description ?? "Something went wrong",
        ProcessTransactionErrorType.SimulationError,
        error.logs,
        parsedError.programId
      );
    }
  }

  async processTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: Array<Signer>,
    opts?: TransactionOptions
  ): Promise<TransactionSignature> {
    let signature: TransactionSignature = "";

    let versionedTransaction: VersionedTransaction;
    const connection = new Connection(this.provider.connection.rpcEndpoint, this.provider.opts);
    let minContextSlot: number;
    let blockhash: string;
    let lastValidBlockHeight: number;

    try {
      const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext();

      minContextSlot = getLatestBlockhashAndContext.context.slot - 4;
      blockhash = getLatestBlockhashAndContext.value.blockhash;
      lastValidBlockHeight = getLatestBlockhashAndContext.value.lastValidBlockHeight;

      if (transaction instanceof Transaction) {
        const versionedMessage = new TransactionMessage({
          instructions: transaction.instructions,
          payerKey: this.provider.publicKey,
          recentBlockhash: blockhash,
        });

        versionedTransaction = new VersionedTransaction(versionedMessage.compileToV0Message(this.addressLookupTables));
      } else {
        versionedTransaction = transaction;
      }

      if (signers) versionedTransaction.sign(signers);
    } catch (error: any) {
      console.log("Failed to build the transaction", error);
      throw new ProcessTransactionError(error.message, ProcessTransactionErrorType.TransactionBuildingError);
    }

    try {
      if (opts?.dryRun || this.isReadOnly) {
        const response = await connection.simulateTransaction(
          versionedTransaction,
          opts ?? { minContextSlot, sigVerify: false }
        );
        console.log(
          response.value.err ? `❌ Error: ${response.value.err}` : `✅ Success - ${response.value.unitsConsumed} CU`
        );
        console.log("------ Logs 👇 ------");
        if (response.value.logs) {
          for (const log of response.value.logs) {
            console.log(log);
          }
        }

        const signaturesEncoded = encodeURIComponent(
          JSON.stringify(versionedTransaction.signatures.map((s) => bs58.encode(s)))
        );
        const messageEncoded = encodeURIComponent(
          Buffer.from(versionedTransaction.message.serialize()).toString("base64")
        );

        const urlEscaped = `https://explorer.solana.com/tx/inspector?cluster=${this.config.cluster}&signatures=${signaturesEncoded}&message=${messageEncoded}`;
        console.log("------ Inspect 👇 ------");
        console.log(urlEscaped);

        if (response.value.err)
          throw new SendTransactionError({
            action: "simulate",
            signature: "",
            transactionMessage: JSON.stringify(response.value.err),
            logs: response.value.logs ?? [],
          });

        return versionedTransaction.signatures[0].toString();
      } else {
        versionedTransaction = await this.wallet.signTransaction(versionedTransaction);
        const base58Tx = bs58.encode(versionedTransaction.serialize());

        let mergedOpts: ConfirmOptions = {
          ...DEFAULT_CONFIRM_OPTS,
          commitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
          preflightCommitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
          minContextSlot,
          ...opts,
        };

        signature = (
          await this.sendTransactionAsBundle([base58Tx]).catch(async () => [
            await connection.sendTransaction(versionedTransaction, {
              // minContextSlot: mergedOpts.minContextSlot,
              skipPreflight: mergedOpts.skipPreflight,
              preflightCommitment: mergedOpts.preflightCommitment,
              maxRetries: mergedOpts.maxRetries,
            }),
          ])
        )[0];
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          mergedOpts.commitment
        );
      }

      return signature;
    } catch (error: any) {
      const parsedError = parseTransactionError(error, this.config.programId);

      if (error?.logs?.length > 0) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
        if (parsedError) {
          console.log("Parsed:", parsedError);
          throw new ProcessTransactionError(
            parsedError.description,
            ProcessTransactionErrorType.SimulationError,
            error.logs,
            parsedError.programId
          );
        }
      }
      console.log("fallthrough error", error);
      throw new ProcessTransactionError(
        parsedError?.description ?? "Something went wrong",
        ProcessTransactionErrorType.SimulationError,
        error.logs,
        parsedError.programId
      );
    }
  }

  private async sendTransactionAsBundle(base58Txs: string[]): Promise<string[]> {
    try {
      const sendBundleResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendBundle",
          params: [base58Txs],
        }),
      });

      const sendBundleResult = await sendBundleResponse.json();
      if (sendBundleResult.error) throw new Error(sendBundleResult.error.message);

      const bundleId = sendBundleResult.result;

      await sleep(500);

      for (let attempt = 0; attempt < 5; attempt++) {
        const getBundleStatusResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBundleStatuses",
            params: [[bundleId]],
          }),
        });

        const getBundleStatusResult = await getBundleStatusResponse.json();

        if (getBundleStatusResult.error) throw new Error(getBundleStatusResult.error.message);

        const signature = getBundleStatusResult?.result?.value[0]?.transactions;

        if (signature) {
          return signature;
        }

        await sleep(500); // Wait before retrying
      }
    } catch (error) {
      console.error(error);
    }

    throw new Error("Bundle failed");
  }

  async simulateTransactions(
    transactions: (Transaction | VersionedTransaction)[],
    accountsToInspect: PublicKey[]
  ): Promise<(Buffer | null)[]> {
    let versionedTransactions: VersionedTransaction[] = [];
    const connection = new Connection(this.provider.connection.rpcEndpoint, this.provider.opts);
    let blockhash: string;

    try {
      const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext();
      blockhash = getLatestBlockhashAndContext.value.blockhash;

      for (const transaction of transactions) {
        if (transaction instanceof Transaction) {
          const versionedMessage = new TransactionMessage({
            instructions: transaction.instructions,
            payerKey: this.provider.publicKey,
            recentBlockhash: blockhash,
          });

          versionedTransactions.push(
            new VersionedTransaction(versionedMessage.compileToV0Message(this.addressLookupTables))
          );
        } else {
          versionedTransactions.push(transaction);
        }
      }
    } catch (error: any) {
      console.log("Failed to build the transaction", error);
      throw new ProcessTransactionError(error.message, ProcessTransactionErrorType.TransactionBuildingError);
    }

    let response;
    try {
      if (transactions.length === 1) {
        response = await connection.simulateTransaction(versionedTransactions[0], {
          sigVerify: false,
          accounts: { encoding: "base64", addresses: accountsToInspect.map((a) => a.toBase58()) },
        });
        if (response.value.err === null) {
          return response.value.accounts?.map((a) => (a ? Buffer.from(a.data[0], "base64") : null)) ?? [];
        }
      } else {
        response = await simulateBundle(this.bundleSimRpcEndpoint, versionedTransactions, accountsToInspect);
        if (response.value.err === null) {
          return response.value.accounts?.map((a) => (a ? Buffer.from(a.data[0], "base64") : null)) ?? [];
        }
        throw new Error(JSON.stringify(response.value.err));
      }
    } catch (error: any) {
      const parsedError = parseTransactionError(error, this.config.programId);

      if (error?.logs?.length > 0) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
        if (parsedError) {
          console.log("Parsed:", parsedError);
          throw new ProcessTransactionError(
            parsedError.description,
            ProcessTransactionErrorType.FallthroughError,
            error.logs,
            parsedError.programId
          );
        }
      }

      console.log("fallthrough error", error);
      throw new ProcessTransactionError(
        parsedError?.description ?? "Something went wrong",
        ProcessTransactionErrorType.FallthroughError,
        error.logs,
        parsedError.programId
      );
    }

    const error = response.value;
    if (error.logs) {
      console.log("------ Logs 👇 ------");
      console.log(error.logs.join("\n"));
      const errorParsed = parseErrorFromLogs(error.logs, this.config.programId);
      if (errorParsed) {
        console.log("Parsed:", errorParsed);
        throw new ProcessTransactionError(
          errorParsed.description,
          ProcessTransactionErrorType.SimulationError,
          error.logs,
          errorParsed.programId
        );
      }
    }
    console.log("fallthrough error", error);
    throw new ProcessTransactionError(
      "Something went wrong",
      ProcessTransactionErrorType.FallthroughError,
      error?.logs ?? []
    );
  }
}

export default MarginfiClient;

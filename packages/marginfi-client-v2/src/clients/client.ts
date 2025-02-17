import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  AddressLookupTableAccount,
  Commitment,
  ConfirmOptions,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { AccountType, Environment, MarginfiConfig, MarginfiProgram } from "../types";
import { getConfig } from "../config";
import instructions from "../instructions";
import { MarginRequirementType } from "../models/account";
import {
  addTransactionMetadata,
  BankMetadataMap,
  chunkedGetRawMultipleAccountInfoOrdered,
  DEFAULT_COMMITMENT,
  InstructionsWrapper,
  isV0Tx,
  loadBankMetadatas,
  loadKeypair,
  MintLayout,
  NodeWallet,
  RawMint,
  SINGLE_POOL_PROGRAM_ID,
  SolanaTransaction,
  TransactionOptions,
  TransactionType,
  Wallet,
  loadStakedBankMetadatas,
} from "@mrgnlabs/mrgn-common";
import { MarginfiGroup } from "../models/group";
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
  OracleSetup,
} from "..";
import { MarginfiAccountWrapper } from "../models/account/wrapper";
import { ProcessTransactionError, ProcessTransactionErrorType, parseTransactionError } from "../errors";
import { findOracleKey, PythPushFeedIdMap, buildFeedIdMap } from "../utils";
import {
  ProcessTransactionOpts,
  ProcessTransactionStrategy,
  ProcessTransactionsClientOpts,
  processTransactions,
} from "../services";
import { BundleSimulationError, simulateBundle } from "../services/transaction/helpers";
import { getStakeAccount, StakeAccount } from "../vendor";
import BigNumber from "bignumber.js";

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
  processTransactionStrategy?: ProcessTransactionStrategy;
  bankMetadataMap?: BankMetadataMap;
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
  public lookupTablesAddresses: PublicKey[];
  public feedIdMap: PythPushFeedIdMap;
  public processTransactionStrategy?: ProcessTransactionStrategy;
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
    bundleSimRpcEndpoint?: string,
    processTransactionStrategy?: ProcessTransactionStrategy,
    lookupTablesAddresses?: PublicKey[]
  ) {
    this.group = group;
    this.banks = banks;
    this.oraclePrices = priceInfos;
    this.mintDatas = mintDatas;
    this.addressLookupTables = addressLookupTables ?? [];
    this.preloadedBankAddresses = preloadedBankAddresses;
    this.feedIdMap = feedIdMap;
    this.bundleSimRpcEndpoint = bundleSimRpcEndpoint ?? program.provider.connection.rpcEndpoint;
    this.processTransactionStrategy = processTransactionStrategy;
    this.lookupTablesAddresses = lookupTablesAddresses ?? [];
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

    let bankMetadataMap: BankMetadataMap | undefined = clientOptions?.bankMetadataMap;
    try {
      if (!bankMetadataMap) {
        bankMetadataMap = {
          ...(await loadBankMetadatas()),
          ...(await loadStakedBankMetadatas()),
        };
      }
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
      bankMetadataMap,
      clientOptions?.bundleSimRpcEndpoint,
      clientOptions?.processTransactionStrategy
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

    const pythStakedCollateralBanks: PublicKey[] = [];

    const priceInfos = new Map(
      bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
        const priceDataRaw = oracleAis[index];
        if (!priceDataRaw) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
        const oracleSetup = parseOracleSetup(bankData.config.oracleSetup);
        if (oracleSetup === OracleSetup.StakedWithPythPush) {
          pythStakedCollateralBanks.push(bankAddress);
        }
        return [bankAddress.toBase58(), parsePriceInfo(oracleSetup, priceDataRaw.data)];
      })
    );

    if (pythStakedCollateralBanks.length > 0 && bankMetadataMap) {
      const stakedCollatMap: Record<
        string,
        {
          bankAddress: PublicKey;
          mint: PublicKey;
          stakePoolAddress: PublicKey;
          poolAddress: PublicKey;
        }
      > = {};
      const solPools: string[] = [];
      const mints: string[] = [];

      pythStakedCollateralBanks.forEach((bankAddress) => {
        const bankMetadata = bankMetadataMap[bankAddress.toBase58()];
        if (bankMetadata && bankMetadata.validatorVoteAccount) {
          const [poolAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), new PublicKey(bankMetadata.validatorVoteAccount).toBuffer()],
            SINGLE_POOL_PROGRAM_ID
          );
          const [stakePoolAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("stake"), poolAddress.toBuffer()],
            SINGLE_POOL_PROGRAM_ID
          );

          stakedCollatMap[bankAddress.toBase58()] = {
            bankAddress,
            mint: new PublicKey(bankMetadata.tokenAddress),
            stakePoolAddress,
            poolAddress,
          };
          solPools.push(stakePoolAddress.toBase58());
          mints.push(bankMetadata.tokenAddress);
        }
      });

      const dataAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
        ...mints,
        ...solPools,
      ]);
      const stakePoolsAis: StakeAccount[] = dataAis.slice(mints.length).map((ai) => getStakeAccount(ai.data));
      const lstMintsAis: RawMint[] = dataAis.slice(0, mints.length).map((mintAi) => MintLayout.decode(mintAi.data));

      const lstMintRecord: Record<string, RawMint> = Object.fromEntries(mints.map((mint, i) => [mint, lstMintsAis[i]]));
      const solPoolsRecord: Record<string, StakeAccount> = Object.fromEntries(
        solPools.map((poolKey, i) => [poolKey, stakePoolsAis[i]])
      );

      for (const index in stakedCollatMap) {
        const { bankAddress, mint, stakePoolAddress, poolAddress } = stakedCollatMap[index];
        const stakeAccount = solPoolsRecord[stakePoolAddress.toBase58()];
        const tokenSupply = lstMintRecord[mint.toBase58()].supply;

        const stakeActual = Number(stakeAccount.stake.delegation.stake);

        const oracle = priceInfos.get(bankAddress.toBase58());
        if (oracle) {
          const adjustPrice = (price: BigNumber, stakeActual: number, tokenSupply: bigint) => {
            return Number(tokenSupply) === 0
              ? price
              : new BigNumber((price.toNumber() * (stakeActual - LAMPORTS_PER_SOL)) / Number(tokenSupply));
          };

          const adjustPriceComponent = (priceComponent: any, stakeActual: number, tokenSupply: bigint) => ({
            price: adjustPrice(priceComponent.price, stakeActual, tokenSupply),
            confidence: priceComponent.confidence,
            lowestPrice: adjustPrice(priceComponent.lowestPrice, stakeActual, tokenSupply),
            highestPrice: adjustPrice(priceComponent.highestPrice, stakeActual, tokenSupply),
          });

          const oraclePrice = {
            timestamp: oracle.timestamp,
            priceRealtime: adjustPriceComponent(oracle.priceRealtime, stakeActual, tokenSupply),
            priceWeighted: adjustPriceComponent(oracle.priceWeighted, stakeActual, tokenSupply),
          };

          priceInfos.set(bankAddress.toBase58(), oraclePrice);
        }
      }
    }

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
   * @param createOpts - Options for creating the account
   * @param createOpts.newAccountKey - Optional public key to use for the new account. If not provided, a new keypair will be generated.
   * @param processOpts - Options for processing the transaction
   * @param txOpts - Transaction options
   * @returns Object containing the transaction signature and the created MarginfiAccount instance
   */
  async createMarginfiAccount(
    createOpts?: { newAccountKey?: PublicKey | undefined },
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<MarginfiAccountWrapper> {
    const dbg = require("debug")("mfi:client");

    const accountKeypair = Keypair.generate();
    const newAccountKey = createOpts?.newAccountKey ?? accountKeypair.publicKey;

    const solanaTx = await this.createMarginfiAccountTx({ accountKeypair });
    const sig = await this.processTransaction(solanaTx, processOpts, txOpts);

    dbg("Created Marginfi account %s", sig);

    return txOpts?.dryRun || createOpts?.newAccountKey
      ? Promise.resolve(undefined as unknown as MarginfiAccountWrapper)
      : MarginfiAccountWrapper.fetch(newAccountKey, this, txOpts?.commitment);
  }

  /**
   * Create a transaction to initialize a new marginfi account under the authority of the user.
   *
   * @param createOpts - Options for creating the account
   * @param createOpts.newAccountKey - Optional public key to use for the new account. If not provided, a new keypair will be generated.
   * @returns Transaction that can be used to create a new marginfi account
   */
  async createMarginfiAccountTx(createOpts?: { accountKeypair?: Keypair }): Promise<SolanaTransaction> {
    const accountKeypair = createOpts?.accountKeypair ?? Keypair.generate();

    const ixs = await this.makeCreateMarginfiAccountIx(accountKeypair.publicKey);
    const signers = [...ixs.keys];
    // If there was no newAccountKey provided, we need to sign with the ephemeraKeypair we generated.
    signers.push(accountKeypair);

    const tx = new Transaction().add(...ixs.instructions);
    const solanaTx = addTransactionMetadata(tx, {
      signers,
      addressLookupTables: this.addressLookupTables,
      type: TransactionType.CREATE_ACCOUNT,
    });

    return solanaTx;
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
   * Initiates a new permissionless marginfi bank under the authority of the user.
   *
   * @param {Object} params - The parameters for creating a permissionless bank.
   * @param {PublicKey} params.mint - The public key of the mint for the bank.
   * @param {BankConfigOpt} params.bankConfig - The configuration options for the bank.
   * @param {PublicKey} params.group - The public key of the group to which the bank belongs.
   * @param {PublicKey} params.admin - The public key of the admin who will have authority over the bank.
   * @param {Keypair} [params.seed] - An optional keypair used as a seed for generating the bank account.
   * @param {TransactionOptions} [params.txOpts] - Optional transaction options for processing.
   * @param {ProcessTransactionsClientOpts} [params.processOpts] - Optional processing options for transactions.
   * @returns {Promise<TransactionSignature>} A promise that resolves to the transaction signature as a string.
   */
  async createPermissionlessBank({
    mint,
    bankConfig,
    group,
    admin,
    seed,
    txOpts,
    processOpts,
  }: {
    mint: PublicKey;
    bankConfig: BankConfigOpt;
    group: PublicKey;
    admin: PublicKey;
    seed?: Keypair;
    processOpts?: ProcessTransactionsClientOpts;
    txOpts?: TransactionOptions;
  }): Promise<TransactionSignature> {
    const dbg = require("debug")("mfi:client");

    const keypair = seed ?? Keypair.generate();
    const bankIxs = await this.group.makePoolAddBankIx(this.program, keypair.publicKey, mint, bankConfig, {
      admin,
      groupAddress: group,
    });

    const signers = [...bankIxs.keys, keypair];

    const tx = new Transaction().add(...bankIxs.instructions);

    const solanaTx = addTransactionMetadata(tx, {
      signers,
      addressLookupTables: this.addressLookupTables,
      type: TransactionType.CREATE_PERM_BANK,
    });
    const sig = await this.processTransaction(solanaTx, processOpts, txOpts);
    dbg("Created Marginfi group %s", sig);

    return sig;
  }

  /**
   * Initializes a new marginfi group with the specified parameters.
   *
   * @param seed - Optional keypair used for generating the group account.
   * @param additionalIxs - Optional array of additional transaction instructions to include.
   * @param txOpts - Optional transaction options for processing.
   * @param processOpts - Optional processing options for transactions.
   * @returns The public key of the newly created marginfi group.
   */
  async createMarginfiGroup(
    seed?: Keypair,
    additionalIxs?: TransactionInstruction[],
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<PublicKey> {
    const dbg = require("debug")("mfi:client");

    const accountKeypair = seed ?? Keypair.generate();

    const ixs = await this.makeCreateMarginfiGroupIx(accountKeypair.publicKey);
    const signers = [...ixs.keys, accountKeypair];
    const tx = new Transaction().add(...ixs.instructions, ...(additionalIxs ?? []));
    const solanaTx = addTransactionMetadata(tx, {
      signers,
      addressLookupTables: this.addressLookupTables,
      type: TransactionType.CREATE_GROUP,
    });
    const sig = await this.processTransaction(solanaTx, processOpts, txOpts);
    dbg("Created Marginfi group %s", sig);

    return Promise.resolve(accountKeypair.publicKey);
  }

  /**
   * Create a new bank under the authority of the user.
   *
   * @param bankMint - The public key of the token mint for the bank.
   * @param bankConfig - Configuration options for the bank.
   * @param seed - Optional keypair for the bank.
   * @param txOpts - Optional transaction options for processing.
   * @param processOpts - Optional processing options for transactions.
   * @returns The bank's public key and the transaction signature
   */
  async createLendingPool(
    bankMint: PublicKey,
    bankConfig: BankConfigOpt,
    seed?: Keypair,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<{ bankAddress: PublicKey; signature: TransactionSignature }> {
    const dbg = require("debug")("mfi:client");

    const bankKeypair = seed ?? Keypair.generate();

    const ixs = await this.group.makePoolAddBankIx(this.program, bankKeypair.publicKey, bankMint, bankConfig, {});
    const signers = [...ixs.keys, bankKeypair];
    const tx = new Transaction().add(...ixs.instructions);

    const solanaTx = addTransactionMetadata(tx, {
      signers,
      addressLookupTables: this.addressLookupTables,
      type: TransactionType.CREATE_PERM_BANK,
    });
    const sig = await this.processTransaction(solanaTx, processOpts, txOpts);
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
   * Processes multiple Solana transactions by signing and sending them to the network.
   *
   * @param {SolanaTransaction[]} transactions - An array of transactions to be processed.
   * @param {ProcessTransactionsClientOpts} [processOpts] - Optional processing options for transactions.
   * @param {TransactionOptions} [txOpts] - Optional transaction options for processing.
   *
   * @returns {Promise<TransactionSignature[]>} - A promise that resolves to an array of transaction signatures.
   *
   * @throws {ProcessTransactionError} - Throws an error if transaction processing fails.
   */
  async processTransactions(
    transactions: SolanaTransaction[],
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature[]> {
    const options: ProcessTransactionOpts = {
      ...processOpts,
      isReadOnly: this.isReadOnly,
      programId: this.program.programId,
      bundleSimRpcEndpoint: this.bundleSimRpcEndpoint,
      dynamicStrategy: processOpts?.dynamicStrategy ?? this.processTransactionStrategy,
    };

    console.log("processOpts", processOpts);
    console.log("processTransactions", options);

    return await processTransactions({
      transactions,
      connection: this.provider.connection,
      wallet: this.provider.wallet,
      processOpts: options,
      txOpts,
    });
  }

  /**
   * Processes a single Solana transaction by signing and sending it to the network.
   *
   * @param {SolanaTransaction} transaction - The transaction to be processed.
   * @param {TransactionOptions} [txOpts] - Optional transaction options.
   * @param {ProcessTransactionsClientOpts} [processOpts] - Optional processing options.
   *
   * @returns {Promise<TransactionSignature>} - A promise that resolves to the transaction signature.
   *
   * @throws {ProcessTransactionError} - Throws an error if transaction processing fails.
   */
  async processTransaction(
    transaction: SolanaTransaction,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    transaction.addressLookupTables = transaction.addressLookupTables || this.addressLookupTables;

    const options: ProcessTransactionOpts = {
      ...processOpts,
      isReadOnly: this.isReadOnly,
      programId: this.program.programId,
      bundleSimRpcEndpoint: this.bundleSimRpcEndpoint,
      dynamicStrategy: processOpts?.dynamicStrategy ?? this.processTransactionStrategy,
    };

    const [signature] = await processTransactions({
      transactions: [transaction],
      connection: this.provider.connection,
      wallet: this.provider.wallet,
      processOpts: options,
      txOpts,
    });

    return signature;
  }

  async simulateTransactions(
    transactions: (Transaction | VersionedTransaction)[],
    accountsToInspect: PublicKey[]
  ): Promise<(Buffer | null)[]> {
    let versionedTransactions: VersionedTransaction[] = [];
    const connection = new Connection(this.provider.connection.rpcEndpoint, this.provider.opts);
    let blockhash: string;

    try {
      const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext("confirmed");
      blockhash = getLatestBlockhashAndContext.value.blockhash;

      for (const transaction of transactions) {
        if (isV0Tx(transaction)) {
          versionedTransactions.push(transaction);
        } else {
          const versionedMessage = new TransactionMessage({
            instructions: transaction.instructions,
            payerKey: this.provider.publicKey,
            recentBlockhash: blockhash,
          });

          versionedTransactions.push(
            new VersionedTransaction(versionedMessage.compileToV0Message(this.addressLookupTables))
          );
        }
      }
    } catch (error: any) {
      throw new ProcessTransactionError({
        message: error.message,
        type: ProcessTransactionErrorType.TransactionBuildingError,
      });
    }

    let response;
    try {
      if (transactions.length === 1) {
        response = await connection.simulateTransaction(versionedTransactions[0], {
          sigVerify: false,
          accounts: { encoding: "base64", addresses: accountsToInspect.map((a) => a.toBase58()) },
        });
        if (response.value.err) {
          const error = response.value.err;
          const parsedError = parseTransactionError(error, this.config.programId);
          throw new ProcessTransactionError({
            message: parsedError.description ?? JSON.stringify(response.value.err),
            type: ProcessTransactionErrorType.SimulationError,
            logs: response.value.logs ?? [],
            programId: parsedError.programId,
          });
        }
        return response.value.accounts?.map((a) => (a ? Buffer.from(a.data[0], "base64") : null)) ?? [];
      } else {
        const simulationResult = await simulateBundle(
          this.bundleSimRpcEndpoint,
          versionedTransactions,
          accountsToInspect
        );
        const value = simulationResult[simulationResult.length - 1];

        const accounts = value.postExecutionAccounts;
        return accounts?.map((a: any) => (a ? Buffer.from(a.data[0], "base64") : null)) ?? [];
      }
    } catch (error: any) {
      if (error instanceof ProcessTransactionError) throw error;

      const parsedError = parseTransactionError(error, this.config.programId);

      if (error instanceof BundleSimulationError) {
        throw new ProcessTransactionError({
          message: parsedError.description,
          type: ProcessTransactionErrorType.SimulationError,
          logs: error.logs,
          programId: parsedError.programId,
        });
      }

      if (error?.logs?.length > 0) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
        if (parsedError) {
          console.log("Parsed:", parsedError);
          throw new ProcessTransactionError({
            message: parsedError.description,
            type: ProcessTransactionErrorType.SimulationError,
            logs: error.logs,
            programId: parsedError.programId,
          });
        }
      }

      console.log("fallthrough error", error);
      throw new ProcessTransactionError({
        message: parsedError?.description ?? "Something went wrong",
        type: ProcessTransactionErrorType.FallthroughError,
        logs: error.logs,
        programId: parsedError.programId,
      });
    }
  }
}

export default MarginfiClient;

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
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { AccountType, Environment, MarginfiConfig, MarginfiProgram } from "./types";
import { MARGINFI_IDL } from "./idl";
import { getConfig } from "./config";
import instructions from "./instructions";
import { MarginRequirementType, MarginfiAccountRaw } from "./models/account";
import {
  DEFAULT_COMMITMENT,
  DEFAULT_CONFIRM_OPTS,
  InstructionsWrapper,
  loadKeypair,
  NodeWallet,
  TransactionOptions,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { MarginfiGroup } from "./models/group";
import { BankRaw, parseOracleSetup, parsePriceInfo, Bank, OraclePrice, ADDRESS_LOOKUP_TABLE_FOR_GROUP } from ".";
import { MarginfiAccountWrapper } from "./models/account/wrapper";
import { ProcessTransactionError, ProcessTransactionErrorType, parseErrorFromLogs } from "./errors";

export type BankMap = Map<string, Bank>;
export type OraclePriceMap = Map<string, OraclePrice>;

/**
 * Entrypoint to interact with the marginfi contract.
 */
class MarginfiClient {
  public group: MarginfiGroup;
  public banks: BankMap;
  public oraclePrices: OraclePriceMap;
  private addressLookupTables: AddressLookupTableAccount[];

  // --------------------------------------------------------------------------
  // Factories
  // --------------------------------------------------------------------------

  /**
   * @internal
   */
  private constructor(
    readonly config: MarginfiConfig,
    readonly program: MarginfiProgram,
    readonly wallet: Wallet,
    readonly isReadOnly: boolean,
    group: MarginfiGroup,
    banks: BankMap,
    priceInfos: OraclePriceMap,
    addressLookupTables?: AddressLookupTableAccount[]
  ) {
    this.group = group;
    this.banks = banks;
    this.oraclePrices = priceInfos;
    this.addressLookupTables = addressLookupTables ?? [];
  }

  /**
   * MarginfiClient factory
   *
   * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
   *
   * @param config marginfi config
   * @param wallet User wallet (used to pay fees and sign transactions)
   * @param connection Solana web.js Connection object
   * @param opts Solana web.js ConfirmOptions object
   * @returns MarginfiClient instance
   */
  static async fetch(
    config: MarginfiConfig,
    wallet: Wallet,
    connection: Connection,
    opts?: ConfirmOptions,
    readOnly: boolean = false
  ) {
    const debug = require("debug")("mfi:client");
    debug(
      "Loading Marginfi Client\n\tprogram: %s\n\tenv: %s\n\tgroup: %s\n\turl: %s",
      config.programId,
      config.environment,
      config.groupPk,
      connection.rpcEndpoint
    );
    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...opts,
    });
    const program = new Program(MARGINFI_IDL, config.programId, provider) as any as MarginfiProgram;

    const { marginfiGroup, banks, priceInfos } = await this.fetchGroupData(program, config.groupPk, opts?.commitment);

    const addressLookupTableAddresses = ADDRESS_LOOKUP_TABLE_FOR_GROUP[config.groupPk.toString()] ?? [];
    debug("Fetching address lookup tables for %s", addressLookupTableAddresses);
    const addressLookupTables = (
      await Promise.all(addressLookupTableAddresses.map((address) => connection.getAddressLookupTable(address)))
    )
      .map((response) => response!.value)
      .filter((table) => table !== null) as AddressLookupTableAccount[];

    return new MarginfiClient(config, program, wallet, readOnly, marginfiGroup, banks, priceInfos, addressLookupTables);
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

    const config = await getConfig(env, {
      groupPk: translateAddress(groupPk),
      programId: translateAddress(programId),
    });

    return MarginfiClient.fetch(config, wallet, connection, {
      commitment: connection.commitment,
    });
  }

  // NOTE: 2 RPC calls
  static async fetchGroupData(
    program: MarginfiProgram,
    groupAddress: PublicKey,
    commitment?: Commitment
  ): Promise<{ marginfiGroup: MarginfiGroup; banks: Map<string, Bank>; priceInfos: Map<string, OraclePrice> }> {
    // Fetch & shape all accounts of Bank type (~ bank discovery)
    let bankAccountsData = await program.account.bank.all([
      { memcmp: { offset: 8 + 32 + 1, bytes: groupAddress.toBase58() } },
    ]);
    const bankDatasKeyed = bankAccountsData.map((account) => ({
      address: account.publicKey,
      data: account.account as any as BankRaw,
    }));

    // Batch-fetch the group account and all the oracle accounts as per the banks retrieved above
    const [groupAi, ...priceFeedAis] = await program.provider.connection.getMultipleAccountsInfo(
      [groupAddress, ...bankDatasKeyed.map((b) => b.data.config.oracleKeys[0])],
      commitment
    ); // NOTE: This will break if/when we start having more than 1 oracle key per bank

    // Unpack raw data for group and oracles, and build the `Bank`s map
    if (!groupAi) throw new Error("Failed to fetch the on-chain group data");
    const marginfiGroup = MarginfiGroup.fromBuffer(groupAi.data);

    const banks = new Map(
      bankDatasKeyed.map(({ address, data }) => [address.toBase58(), Bank.fromAccountParsed(address, data)])
    );

    const priceInfos = new Map(
      bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
        const priceDataRaw = priceFeedAis[index];
        if (!priceDataRaw) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
        const oracleSetup = parseOracleSetup(bankData.config.oracleSetup);
        return [bankAddress.toBase58(), parsePriceInfo(oracleSetup, priceDataRaw.data)];
      })
    );

    return {
      marginfiGroup,
      banks,
      priceInfos,
    };
  }

  async reload() {
    const { marginfiGroup, banks, priceInfos } = await MarginfiClient.fetchGroupData(
      this.program,
      this.config.groupPk,
      this.program.provider.connection.commitment
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

  /**
   * Retrieves the addresses of all marginfi accounts in the underlying group.
   *
   * @returns Account addresses
   */
  async getAllMarginfiAccounts(): Promise<MarginfiAccountWrapper[]> {
    return (
      await this.program.account.marginfiAccount.all([
        {
          memcmp: {
            bytes: this.config.groupPk.toBase58(),
            offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
          },
        },
      ])
    ).map((a) => MarginfiAccountWrapper.fromAccountParsed(a.publicKey, this, a.account as MarginfiAccountRaw));
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
              bytes: bs58.encode(BorshAccountsCoder.accountDiscriminator(AccountType.MarginfiAccount)),
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
              bytes: bs58.encode(BorshAccountsCoder.accountDiscriminator(type)),
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

    const ixs = await this.makeCreateMarginfiAccountIx(newAccountKey);
    const signers = [...ixs.keys];
    // If there was no newAccountKey provided, we need to sign with the ephemeraKeypair we generated.
    if (!createOpts?.newAccountKey) signers.push(accountKeypair);

    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.processTransaction(tx, signers, opts);

    dbg("Created Marginfi account %s", sig);

    return opts?.dryRun
      ? Promise.resolve(undefined as unknown as MarginfiAccountWrapper)
      : MarginfiAccountWrapper.fetch(newAccountKey, this, opts?.commitment);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Process a transaction, sign it and send it to the network.
   *
   * @throws ProcessTransactionError
   */
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

      minContextSlot = getLatestBlockhashAndContext.context.slot;
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
        console.log(response.value.logs);

        const signaturesEncoded = encodeURIComponent(
          JSON.stringify(versionedTransaction.signatures.map((s) => bs58.encode(s)))
        );
        const messageEncoded = encodeURIComponent(
          Buffer.from(versionedTransaction.message.serialize()).toString("base64")
        );
        console.log(Buffer.from(versionedTransaction.message.serialize()).toString("base64"));

        const urlEscaped = `https://explorer.solana.com/tx/inspector?cluster=${this.config.cluster}&signatures=${signaturesEncoded}&message=${messageEncoded}`;
        console.log("------ Inspect 👇 ------");
        console.log(urlEscaped);

        if (response.value.err)
          throw new SendTransactionError(JSON.stringify(response.value.err), response.value.logs ?? []);

        return versionedTransaction.signatures[0].toString();
      } else {
        versionedTransaction = await this.wallet.signTransaction(versionedTransaction);

        let mergedOpts: ConfirmOptions = {
          ...DEFAULT_CONFIRM_OPTS,
          commitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
          preflightCommitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
          minContextSlot,
          ...opts,
        };

        signature = await connection.sendTransaction(versionedTransaction, {
          minContextSlot: mergedOpts.minContextSlot,
          skipPreflight: mergedOpts.skipPreflight,
          preflightCommitment: mergedOpts.preflightCommitment,
          maxRetries: mergedOpts.maxRetries,
        });
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          mergedOpts.commitment
        );
        return signature;
      }
    } catch (error: any) {
      if (error instanceof SendTransactionError) {
        if (error.logs) {
          console.log("------ Logs 👇 ------");
          console.log(error.logs.join("\n"));
          const errorParsed = parseErrorFromLogs(error.logs, this.config.programId);
          console.log("Parsed:", errorParsed);
          throw new ProcessTransactionError(
            errorParsed?.description ?? error.message,
            ProcessTransactionErrorType.SimulationError,
            error.logs
          );
        }
      }
      console.log(error);
      throw new ProcessTransactionError(error.message, ProcessTransactionErrorType.FallthroughError);
    }
  }
}

export default MarginfiClient;

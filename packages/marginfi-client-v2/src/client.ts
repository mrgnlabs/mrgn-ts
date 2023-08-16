import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@project-serum/anchor";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { AccountType, Environment, MarginfiConfig, MarginfiProgram } from "./types";
import { MARGINFI_IDL } from "./idl";
import { getConfig } from "./config";
import MarginfiGroup from "./group";
import instructions from "./instructions";
import MarginfiAccount, { MarginRequirementType, MarginfiAccountData } from "./account";
import {
  DEFAULT_COMMITMENT,
  DEFAULT_CONFIRM_OPTS,
  InstructionsWrapper,
  loadKeypair,
  NodeWallet,
  TransactionOptions,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { OraclePriceData, OracleSetup } from "./bank";
import { parsePriceData } from "@pythnetwork/client";
import { BigNumber } from "bignumber.js";
import { PYTH_PRICE_CONF_INTERVALS, SWB_PRICE_CONF_INTERVALS } from "./constants";
import { AggregatorAccount, SwitchboardProgram } from "@switchboard-xyz/solana.js";

/**
 * Entrypoint to interact with the marginfi contract.
 */
class MarginfiClient {
  public readonly programId: PublicKey;
  private _group: MarginfiGroup;

  /**
   * @internal
   */
  private constructor(
    readonly config: MarginfiConfig,
    readonly program: MarginfiProgram,
    readonly wallet: Wallet,
    group: MarginfiGroup
  ) {
    this.programId = config.programId;
    this._group = group;
  }

  // --- Factories

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
  static async fetch(config: MarginfiConfig, wallet: Wallet, connection: Connection, opts?: ConfirmOptions) {
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
    return new MarginfiClient(config, program, wallet, await MarginfiGroup.fetch(config, program, opts?.commitment));
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

  // --- Getters and setters

  /**
   * Marginfi account group address
   */
  get group(): MarginfiGroup {
    return this._group;
  }

  get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  // --- Others

  /**
   * Create transaction instruction to create a new marginfi account under the authority of the user.
   *
   * @returns transaction instruction
   */
  async makeCreateMarginfiAccountIx(marginfiAccountKeypair?: Keypair): Promise<InstructionsWrapper> {
    const dbg = require("debug")("mfi:client");
    const accountKeypair = marginfiAccountKeypair || Keypair.generate();

    dbg("Generating marginfi account ix for %s", accountKeypair.publicKey);

    const initMarginfiAccountIx = await instructions.makeInitMarginfiAccountIx(this.program, {
      marginfiGroupPk: this._group.publicKey,
      marginfiAccountPk: accountKeypair.publicKey,
      authorityPk: this.provider.wallet.publicKey,
      feePayerPk: this.provider.wallet.publicKey,
    });

    const ixs = [initMarginfiAccountIx];

    return {
      instructions: ixs,
      keys: [accountKeypair],
    };
  }

  /**
   * Create a new marginfi account under the authority of the user.
   *
   * @returns MarginfiAccount instance
   */
  async createMarginfiAccount(opts?: TransactionOptions): Promise<MarginfiAccount> {
    const dbg = require("debug")("mfi:client");

    const accountKeypair = Keypair.generate();

    const ixs = await this.makeCreateMarginfiAccountIx(accountKeypair);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.processTransaction(tx, ixs.keys, opts);

    dbg("Created Marginfi account %s", sig);

    return opts?.dryRun
      ? Promise.resolve(undefined as unknown as MarginfiAccount)
      : MarginfiAccount.fetch(accountKeypair.publicKey, this, opts?.commitment);
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
              bytes: this._group.publicKey.toBase58(),
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
  async getMarginfiAccountsForAuthority(authority?: Address): Promise<MarginfiAccount[]> {
    const marginfiGroup = await MarginfiGroup.fetch(this.config, this.program);
    const _authority = authority ? translateAddress(authority) : this.provider.wallet.publicKey;

    const marginfiAccounts = (
      await this.program.account.marginfiAccount.all([
        {
          memcmp: {
            bytes: this._group.publicKey.toBase58(),
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
    ).map((a) => MarginfiAccount.fromAccountData(a.publicKey, this, a.account as MarginfiAccountData, marginfiGroup));

    marginfiAccounts.sort((accountA, accountB) => {
      const assetsValueA = accountA.getHealthComponents(MarginRequirementType.Equity).assets;
      const assetsValueB = accountB.getHealthComponents(MarginRequirementType.Equity).assets;

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

  async processTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: Array<Signer>,
    opts?: TransactionOptions
  ): Promise<TransactionSignature> {
    let signature: TransactionSignature = "";

    try {
      let versionedTransaction: VersionedTransaction;
      const connection = new Connection(this.provider.connection.rpcEndpoint, this.provider.opts);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      if (transaction instanceof Transaction) {
        const versionedMessage = new TransactionMessage({
          instructions: transaction.instructions,
          payerKey: this.provider.publicKey,
          recentBlockhash: blockhash,
        });

        versionedTransaction = new VersionedTransaction(versionedMessage.compileToV0Message([]));
      } else {
        versionedTransaction = transaction;
      }

      versionedTransaction = await this.wallet.signTransaction(versionedTransaction);
      if (signers) versionedTransaction.sign(signers);

      if (opts?.dryRun) {
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

        return versionedTransaction.signatures[0].toString();
      } else {
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
      if (error.logs) {
        console.log("------ Logs 👇 ------");
        console.log(error.logs.join("\n"));
      }

      throw `Transaction failed! ${error?.message}`;
    }
  }
}

export default MarginfiClient;

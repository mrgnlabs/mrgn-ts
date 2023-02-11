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
import {
  AccountType,
  Amount,
  Environment,
  InstructionsWrapper,
  LipConfig,
  LipProgram,
  TransactionOptions,
  Wallet,
} from "./types";
import { LIP_IDL } from "./idl";
import { NodeWallet } from "./nodeWallet";
import { loadKeypair, uiToNative } from "./utils";
import { getConfig } from "./config";
import instructions from "./instructions";
import { DEFAULT_COMMITMENT, DEFAULT_CONFIRM_OPTS } from "./constants";

/**
 * Entrypoint to interact with the LIP contract.
 */
class LipClient {
  public readonly programId: PublicKey;
//   private _group: MarginfiGroup;

  /**
   * @internal
   */
  private constructor(
    readonly config: LipConfig,
    readonly program: LipProgram,
    readonly wallet: Wallet,
  ) {
    this.programId = config.programId;
  }

  // --- Factories

  /**
   * LipClient factory
   *
   * Fetch account data according to the config.
   *
   * @param config Lip config
   * @param wallet User wallet (used to pay fees and sign transactions)
   * @param connection Solana web.js Connection object
   * @param opts Solana web.js ConfirmOptions object
   * @returns LipClient instance
   */
  static async fetch(config: LipConfig, wallet: Wallet, connection: Connection, opts?: ConfirmOptions) {
    const debug = require("debug")("lip:client");
    debug(
      "Loading Lip Client\n\tprogram: %s\n\tenv: %s\n\turl: %s",
      config.programId,
      config.environment,
    //   config.groupPk,
      connection.rpcEndpoint
    );
    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...opts,
    });

    const program = new Program(LIP_IDL, config.programId, provider) as any as LipProgram;
    return new LipClient(config, program, wallet);
  }

  static async fromEnv(
    overrides?: Partial<{
      env: Environment;
      connection: Connection;
      programId: Address;
    //   marginfiGroup: Address;
      wallet: Wallet;
    }>
  ): Promise<LipClient> {
    const debug = require("debug")("lip:client");
    const env = overrides?.env ?? (process.env.MARGINFI_ENV! as Environment);
    const connection =
      overrides?.connection ??
      new Connection(process.env.MARGINFI_RPC_ENDPOINT!, {
        commitment: DEFAULT_COMMITMENT,
      });
    const programId = overrides?.programId ?? new PublicKey(process.env.MARGINFI_PROGRAM!);
    const wallet =
      overrides?.wallet ??
      new NodeWallet(
        process.env.MARGINFI_WALLET_KEY
          ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.MARGINFI_WALLET_KEY)))
          : loadKeypair(process.env.MARGINFI_WALLET!)
      );

    debug("Loading the marginfi client from env vars");
    debug("Env: %s\nProgram: %s\nSigner: %s", env, programId, wallet.publicKey);

    const config = await getConfig(env, {
      programId: translateAddress(programId),
    });

    return LipClient.fetch(config, wallet, connection, {
      commitment: connection.commitment,
    });
  }

  // --- Getters and setters

  get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  // --- Others

  async makeDepositIx(amount: Amount): Promise<InstructionsWrapper> {
    const ix = await instructions.makeCreateDepositIx(
      this.program,
      {
        // @NEXT: Set account pubkeys here
        campaign: PublicKey,          // will be hardcoded?
        signer: PublicKey,            // should be this wallet            // isSigner: true
        deposit: PublicKey,           // ?                                // isSigner: true
        mfiPdaSigner: PublicKey,      // ?
        fundingAccount: PublicKey,    // ?
        tempTokenAccount: PublicKey,  // mfi client                       // isSigner: true
        assetMint: PublicKey,         // config'd from the user choice
        marginfiGroup: PublicKey,     // mfi client
        marginfiBank: PublicKey,      // mfi client
        marginfiAccount: PublicKey,   // mfi client
        marginfiBankVault: PublicKey, // mfi client
        marginfiProgram: PublicKey,   // mfi client
        tokenProgram: PublicKey,      // ?
        rent: PublicKey,              // ?
      },
      // @NEXT: Set decimals here
      { amount: uiToNative(amount, 6)}
    )

    return { instructions: [ix], keys: [] };
  }

  async deposit(amount: Amount): Promise<string> {
    const debug = require("debug")(`lip:deposit`);
    debug("Depositing %s into LIP", amount);
    const ixs = await this.makeDepositIx(amount);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.processTransaction(tx);
    debug("Depositing successful %s", sig);
    // @note: will need to manage reload appropriately
    return sig;
  }

  /**
   * Retrieves the addresses of all accounts owned by the LIP program.
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
    transaction: Transaction,
    signers?: Array<Signer>,
    opts?: TransactionOptions
  ): Promise<TransactionSignature> {
    let signature: TransactionSignature = "";
    try {
      const connection = new Connection(this.provider.connection.rpcEndpoint, this.provider.opts);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const versionedMessage = new TransactionMessage({
        instructions: transaction.instructions,
        payerKey: this.provider.publicKey,
        recentBlockhash: blockhash,
      });

      let versionedTransaction = new VersionedTransaction(versionedMessage.compileToV0Message([]));

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
      throw `Transaction failed! ${error?.message}`;
    }
  }
}

export default LipClient;

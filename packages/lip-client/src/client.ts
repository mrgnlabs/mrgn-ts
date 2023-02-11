import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@project-serum/anchor";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
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
import { uiToNative } from "./utils";
import { getConfig } from "./config";
import instructions from "./instructions";
import { DEFAULT_COMMITMENT, DEFAULT_CONFIRM_OPTS, MARGINFI_ACCOUNT_SEED, DEPOSIT_MFI_AUTH_SIGNER_SEED } from "./constants";
import Bank from "../../marginfi-client-v2/src/bank";
import MarginfiClient from "../../marginfi-client-v2/src/client";

/**
 * Entrypoint to interact with the LIP contract.
 */
class LipClient {
  public readonly programId: PublicKey;

  /**
   * @internal
   */
  private constructor(
    readonly config: LipConfig,
    readonly program: LipProgram,
    readonly wallet: Wallet,
    readonly client: MarginfiClient,
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
  static async fetch(config: LipConfig, wallet: Wallet, connection: Connection, marginfiClient: MarginfiClient, opts?: ConfirmOptions) {
    const debug = require("debug")("lip:client");
    debug(
      "Loading Lip Client\n\tprogram: %s\n\tenv: %s\n\turl: %s",
      config.programId,
      config.environment,
      connection.rpcEndpoint
    );
    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...opts,
    });

    const program = new Program(LIP_IDL, config.programId, provider) as any as LipProgram;
    return new LipClient(config, program, wallet, marginfiClient);
  }

  // --- Getters and setters

  get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  // --- Others

  async makeDepositIx(
    campaign: PublicKey,
    amount: Amount,
    bank: Bank,
  ): Promise<InstructionsWrapper> {

    const depositKeypair = Keypair.generate();
    const tempTokenAccountKeypair = Keypair.generate();
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.client.provider.wallet.publicKey,
    });

    const ix = await instructions.makeCreateDepositIx(
      this.program,
      {
        campaign: campaign,
        signer: this.client.provider.wallet.publicKey,
        deposit: depositKeypair.publicKey,
        mfiPdaSigner: PublicKey.findProgramAddressSync(
          [DEPOSIT_MFI_AUTH_SIGNER_SEED, depositKeypair.publicKey.toBuffer()],
          this.programId)[0],
        fundingAccount: userTokenAtaPk,
        tempTokenAccount: tempTokenAccountKeypair.publicKey,
        assetMint: bank.mint,
        marginfiGroup: this.client.group.publicKey,
        marginfiBank: bank.publicKey,
        marginfiAccount: PublicKey.findProgramAddressSync(
          [MARGINFI_ACCOUNT_SEED, depositKeypair.publicKey.toBuffer()],
          this.programId
        )[0],
        marginfiBankVault: bank.liquidityVault,
        marginfiProgram: this.client.programId,
      },
      { amount: uiToNative(amount, bank.mintDecimals)}
    )

    return { 
      instructions: [ix],
      keys: [
        depositKeypair,
        tempTokenAccountKeypair
      ]
    };
  }

  async deposit(
    campaign: PublicKey,
    amount: Amount,
    bank: Bank,
  ): Promise<string> {
    const debug = require("debug")(`lip:deposit`);
    debug("Depositing %s into LIP", amount);
    const ixs = await this.makeDepositIx(campaign, amount, bank);
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
        payerKey: this.client.provider.publicKey,
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

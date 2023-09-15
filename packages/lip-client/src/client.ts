import { AnchorProvider, Program, Address, translateAddress } from "@coral-xyz/anchor";
import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { LipConfig, LipProgram } from "./types";
import { LIP_IDL } from "./idl";
import instructions from "./instructions";
import { DEPOSIT_MFI_AUTH_SIGNER_SEED, MARGINFI_ACCOUNT_SEED } from "./constants";
import { Bank, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Campaign, DepositData } from "./account";
import {
  Amount,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  DEFAULT_CONFIRM_OPTS,
  getAssociatedTokenAddressSync,
  InstructionsWrapper,
  NATIVE_MINT,
  TransactionOptions,
  uiToNative,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import base58 from "bs58";
/**
 * Entrypoint to interact with the LIP contract.
 */
class LipClient {
  public readonly programId: PublicKey;
  public campaigns: Campaign[];

  /**
   * @internal
   */
  private constructor(
    readonly config: LipConfig,
    readonly program: LipProgram,
    readonly wallet: Wallet,
    // Multiple campaigns because campaigns are per asset,
    // and we want to aggregate the value of a user's deposits across campaigns.
    readonly mfiClient: MarginfiClient,
    campaigns: Campaign[]
  ) {
    this.programId = config.programId;
    this.campaigns = campaigns;
  }

  // --- Factories

  static async fetch(config: LipConfig, marginfiClient: MarginfiClient, opts?: ConfirmOptions) {
    const debug = require("debug")("lip:client");
    debug(
      "Loading Lip Client\n\tprogram: %s\n\tenv: %s\n\turl: %s",
      config.programId,
      config.environment,
      marginfiClient.provider.connection.rpcEndpoint
    );

    const provider = new AnchorProvider(marginfiClient.provider.connection, marginfiClient.wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: marginfiClient.provider.connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...opts,
    });
    const program = new Program(LIP_IDL, config.programId, provider) as any as LipProgram;
    const campaigns = await LipClient._fetchAccountData(program, marginfiClient);

    return new LipClient(config, program, marginfiClient.wallet, marginfiClient, campaigns);
  }

  async reload() {
    this.campaigns = await LipClient._fetchAccountData(this.program, this.mfiClient);
  }

  // We construct an array of banks with 1) user and 2) asset information
  // across all campaigns that exist.
  // First, we find all campaigns, then use their banks to pull relevant asset prices.
  private static async _fetchAccountData(program: LipProgram, marginfiClient: MarginfiClient): Promise<Campaign[]> {
    // 1. Fetch all campaigns that exist
    const allCampaigns = (await program.account.campaign.all()).map((c) => ({
      ...c.account,
      publicKey: c.publicKey,
    }));

    // 2. Refresh mfi banks
    await marginfiClient.reload();

    // LipClient takes in a list of campaigns, which is
    // campaigns we've found + bank information we've constructed.
    return allCampaigns.map((campaign, i) => {
      const bank = marginfiClient.getBankByPk(campaign.marginfiBankPk);
      if (!bank) throw new Error(`Bank ${campaign.marginfiBankPk} not found for campaign ${campaign.publicKey}`);
      const oraclePrice = marginfiClient.getOraclePriceByBank(campaign.marginfiBankPk);
      if (!oraclePrice)
        throw new Error(`Oracle price ${campaign.marginfiBankPk} not found for campaign ${campaign.publicKey}`);
      return new Campaign(bank, oraclePrice, campaign);
    });
  }

  // --- Getters

  /**
   * Retrieves all deposit accounts.
   *
   * @returns Deposit instances
   */
  async getAllDepositsPerOwner(): Promise<{ [owner: string]: DepositData[] }> {
    const allAccounts = (await this.program.account.deposit.all()).map(
      ({ account }) => account as unknown as DepositData
    );
    const accountsPerOwner = allAccounts.reduce((acc, account) => {
      const owner = account.owner.toBase58();
      if (!acc[owner]) acc[owner] = [];
      acc[owner].push(account);
      return acc;
    }, {} as { [owner: string]: DepositData[] });

    return accountsPerOwner;
  }

  /**
   * Retrieves all deposit accounts for specified owner.
   *
   * @returns Deposit instances
   */
  async getDepositsForOwner(owner?: Address): Promise<DepositData[]> {
    const _owner = owner ? translateAddress(owner) : this.mfiClient.wallet.publicKey;

    return (
      await this.program.account.deposit.all([
        {
          memcmp: {
            bytes: _owner.toBase58(),
            offset: 8, // owner is the first field in the account after the padding, so offset by the discriminant and a pubkey
          },
        },
      ])
    ).map(({ publicKey, account }) => ({ address: publicKey, ...(account as Object) } as DepositData));
  }

  // --- Others

  async makeDepositIx(campaign: PublicKey, amount: Amount, bank: Bank): Promise<InstructionsWrapper> {
    const depositKeypair = Keypair.generate();
    const tempTokenAccountKeypair = Keypair.generate();
    const userTokenAtaPk = getAssociatedTokenAddressSync(bank.mint, this.mfiClient.provider.wallet.publicKey, true); // We allow off curve addresses here to support Fuse.
    const amountNative = uiToNative(amount, bank.mintDecimals);

    const ixs = [];

    if (bank.mint.equals(NATIVE_MINT)) {
      ixs.push(
        createAssociatedTokenAccountIdempotentInstruction(
          this.wallet.publicKey,
          userTokenAtaPk,
          this.wallet.publicKey,
          NATIVE_MINT
        ),
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: userTokenAtaPk,
          lamports: amountNative.toNumber(),
        }),
        createSyncNativeInstruction(userTokenAtaPk)
      );
    }

    ixs.push(
      await instructions.makeCreateDepositIx(
        this.program,
        {
          campaign: campaign,
          signer: this.mfiClient.provider.wallet.publicKey,
          deposit: depositKeypair.publicKey,
          mfiPdaSigner: PublicKey.findProgramAddressSync(
            [DEPOSIT_MFI_AUTH_SIGNER_SEED, depositKeypair.publicKey.toBuffer()],
            this.programId
          )[0],
          fundingAccount: userTokenAtaPk,
          tempTokenAccount: tempTokenAccountKeypair.publicKey,
          assetMint: bank.mint,
          marginfiGroup: this.mfiClient.groupAddress,
          marginfiBank: bank.address,
          marginfiAccount: PublicKey.findProgramAddressSync(
            [MARGINFI_ACCOUNT_SEED, depositKeypair.publicKey.toBuffer()],
            this.programId
          )[0],
          marginfiBankVault: bank.liquidityVault,
          marginfiProgram: this.mfiClient.programId,
        },
        { amount: amountNative }
      )
    );

    return {
      instructions: ixs,
      keys: [depositKeypair, tempTokenAccountKeypair],
    };
  }

  async deposit(campaign: PublicKey, amount: Amount, bank: Bank): Promise<string> {
    const debug = require("debug")(`lip:deposit`);
    debug("Depositing %s into LIP", amount);
    const ixs = await this.makeDepositIx(campaign, amount, bank);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.processTransaction(tx, ixs.keys);
    debug("Depositing successful %s", sig);
    // @note: will need to manage reload appropriately
    return sig;
  }

  async processTransaction(
    transaction: Transaction,
    signers?: Array<Signer>,
    opts?: TransactionOptions
  ): Promise<TransactionSignature> {
    let signature: TransactionSignature = "";
    try {
      const connection = new Connection(this.program.provider.connection.rpcEndpoint, this.program.provider.opts);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const versionedMessage = new TransactionMessage({
        instructions: transaction.instructions,
        payerKey: this.mfiClient.provider.wallet.publicKey,
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
          JSON.stringify(versionedTransaction.signatures.map((s) => base58.encode(s)))
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

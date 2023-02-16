import { AnchorProvider, Program } from "@project-serum/anchor";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  AccountInfo,
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
import Bank, { BankData } from "../../marginfi-client-v2/src/bank";
import MarginfiClient from "../../marginfi-client-v2/src/client";
import { Address, translateAddress } from "@coral-xyz/anchor";
import { Campaign, DepositData } from "./account";
import { parsePriceData } from "@pythnetwork/client";
import {
  Amount,
  DEFAULT_CONFIRM_OPTS,
  InstructionsWrapper,
  TransactionOptions,
  uiToNative,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
} from "@mrgnlabs/mrgn-common/src/spl";

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

  static async fetch(
    config: LipConfig,
    wallet: Wallet,
    connection: Connection,
    marginfiClient: MarginfiClient,
    opts?: ConfirmOptions
  ) {
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
    const campaigns = await LipClient._fetchAccountData(program, marginfiClient);
    console.log(
      "all campaigns",
      campaigns.map((c) => c.bank.label + " " + c.publicKey.toBase58())
    );

    return new LipClient(config, program, wallet, marginfiClient, campaigns);
  }

  async reload() {
    this.campaigns = await LipClient._fetchAccountData(this.program, this.mfiClient);
  }

  // We construct an array of banks with 1) user and 2) asset information
  // across all campaigns that exist.
  // First, we find all campaigns, then use their banks to pull relevant asset prices.
  private static async _fetchAccountData(program: LipProgram, marginfiClient: MarginfiClient): Promise<Campaign[]> {
    // 1. Fetch all campaigns that exist
    console.log("fetching campaigns");
    const allCampaigns = (await program.account.campaign.all()).map((c) => ({
      ...c.account,
      publicKey: c.publicKey,
    }));
    // 2. Get relevant banks for all campaigns
    const relevantBankPks = allCampaigns.map((d) => d.marginfiBankPk);
    // 3. Fetch all banks
    console.log("fetching banks");
    const banksWithNulls = await marginfiClient.program.account.bank.fetchMultiple(relevantBankPks);
    // 4. Filter out banks that aren't found
    // This shouldn't happen, but is a workaround in case it does.
    const banksData = banksWithNulls.filter((c) => c !== null) as BankData[];
    if (banksData.length !== banksWithNulls.length) throw new Error("Some banks were not found");

    // 5. Fetch all accounts that pyth writes oracle data too
    console.log("fetching price feeds");
    const pythAccountsWithNulls = await program.provider.connection.getMultipleAccountsInfo(
      banksData.map((b) => (b as BankData).config.oracleKeys[0])
    );
    const pythAccounts = pythAccountsWithNulls.filter((c) => c !== null) as AccountInfo<Buffer>[];
    if (pythAccounts.length !== pythAccountsWithNulls.length) throw new Error("Some price feeds were not found");

    const banks = banksData.map((bd, index) => {
      const bankConfig = marginfiClient.config.banks.find((bc) => bc.address.equals(relevantBankPks[index]));
      if (!bankConfig) throw new Error(`Bank config not found for ${relevantBankPks[index]}`);
      return new Bank(
        bankConfig.label,
        relevantBankPks[index],
        bd as BankData,
        parsePriceData(pythAccounts[index]!.data)
      );
    });

    if (banks.length !== allCampaigns.length) {
      return Promise.reject("Some of the banks were not found");
    }

    // LipClient takes in a list of campaigns, which is
    // campaigns we've found + bank information we've constructed.
    return allCampaigns.map((campaign, i) => {
      return {
        bank: banks[i],
        maxRewards: campaign.maxRewards,
        maxDeposits: campaign.maxDeposits,
        lockupPeriod: campaign.lockupPeriod,
        publicKey: campaign.publicKey,
        marginfiBankPk: banks[i].publicKey,
        remainingCapacity: campaign.remainingCapacity,
      };
    });
  }

  // --- Getters

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
    ).map(({ account }) => account as unknown as DepositData);
  }

  // --- Others

  async makeDepositIx(campaign: PublicKey, amount: Amount, bank: Bank): Promise<InstructionsWrapper> {
    const depositKeypair = Keypair.generate();
    const tempTokenAccountKeypair = Keypair.generate();
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: this.mfiClient.provider.wallet.publicKey,
    });
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
          marginfiGroup: this.mfiClient.group.publicKey,
          marginfiBank: bank.publicKey,
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
        payerKey: this.mfiClient.provider.publicKey,
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

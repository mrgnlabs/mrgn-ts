import { AnchorProvider, Program } from "@project-serum/anchor";
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
    readonly mfiClient: MarginfiClient,
    campaigns: Campaign[],
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
    opts?: ConfirmOptions,
  ) {
    const debug = require("debug")("lip:client");
    debug(
      "Loading Lip Client\n\tprogram: %s\n\tenv: %s\n\turl: %s",
      config.programId,
      config.environment,
      connection.rpcEndpoint,
    );
    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...opts,
    });

    const program = new Program(LIP_IDL, config.programId, provider) as any as LipProgram;

    const allCampaigns = (await program.account.campaign.all()).map((c, i) => ({
      ...c.account,
      publicKey: c.publicKey,
    }));
    const relevantBanks = allCampaigns.map((d) => d.marginfiBankPk);
    const banksWithNulls = await marginfiClient.program.account.bank.fetchMultiple(relevantBanks);
    const banksData = banksWithNulls.filter((c) => c !== null) as BankData[];
    const pythAccounts = await program.provider.connection.getMultipleAccountsInfo(
      banksData.map((b) => (b as BankData).config.oracleKeys[0]),
    );
    const banks = banksData.map(
      (bd, index) =>
        new Bank(
          marginfiClient.config.banks[index].label,
          relevantBanks[index],
          bd as BankData,
          parsePriceData(pythAccounts[index]!.data),
        ),
    );

    if (banks.length !== allCampaigns.length) {
      return Promise.reject("Some of the banks were not found");
    }

    const campaigns = allCampaigns.map((campaign, i) => {
      return { ...campaign, bank: banks[i] };
    });

    return new LipClient(config, program, wallet, marginfiClient, campaigns);
  }

  async reload() {
    const allCampaigns = (await this.program.account.campaign.all()).map((c, i) => ({
      ...c.account,
      publicKey: c.publicKey,
    }));
    const relevantBanks = allCampaigns.map((d) => d.marginfiBankPk);
    const banksWithNulls = await this.mfiClient.program.account.bank.fetchMultiple(relevantBanks);
    const banksData = banksWithNulls.filter((c) => c !== null) as BankData[];
    const pythAccounts = await this.program.provider.connection.getMultipleAccountsInfo(
      banksData.map((b) => (b as BankData).config.oracleKeys[0]),
    );
    const banks = banksData.map(
      (bd, index) =>
        new Bank(
          this.mfiClient.config.banks[index].label,
          relevantBanks[index],
          bd as BankData,
          parsePriceData(pythAccounts[index]!.data),
        ),
    );

    if (banks.length !== allCampaigns.length) {
      return Promise.reject("Some of the banks were not found");
    }

    this.campaigns = allCampaigns.map((campaign, i) => {
      return { ...campaign, bank: banks[i] };
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

    const ix = await instructions.makeCreateDepositIx(
      this.program,
      {
        campaign: campaign,
        signer: this.mfiClient.provider.wallet.publicKey,
        deposit: depositKeypair.publicKey,
        mfiPdaSigner: PublicKey.findProgramAddressSync(
          [DEPOSIT_MFI_AUTH_SIGNER_SEED, depositKeypair.publicKey.toBuffer()],
          this.programId,
        )[0],
        fundingAccount: userTokenAtaPk,
        tempTokenAccount: tempTokenAccountKeypair.publicKey,
        assetMint: bank.mint,
        marginfiGroup: this.mfiClient.group.publicKey,
        marginfiBank: bank.publicKey,
        marginfiAccount: PublicKey.findProgramAddressSync(
          [MARGINFI_ACCOUNT_SEED, depositKeypair.publicKey.toBuffer()],
          this.programId,
        )[0],
        marginfiBankVault: bank.liquidityVault,
        marginfiProgram: this.mfiClient.programId,
      },
      { amount: uiToNative(amount, bank.mintDecimals) },
    );

    return {
      instructions: [ix],
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
    opts?: TransactionOptions,
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
          opts ?? { minContextSlot, sigVerify: false },
        );
        console.log(
          response.value.err ? `❌ Error: ${response.value.err}` : `✅ Success - ${response.value.unitsConsumed} CU`,
        );
        console.log("------ Logs 👇 ------");
        console.log(response.value.logs);

        const signaturesEncoded = encodeURIComponent(
          JSON.stringify(versionedTransaction.signatures.map((s) => bs58.encode(s))),
        );
        const messageEncoded = encodeURIComponent(
          Buffer.from(versionedTransaction.message.serialize()).toString("base64"),
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
          mergedOpts.commitment,
        );
        return signature;
      }
    } catch (error: any) {
      throw `Transaction failed! ${error?.message}`;
    }
  }
}

export default LipClient;

import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { LIP_IDL } from ".";
import LipClient from "./client";
import { Bank, BankVaultType, MarginfiClient, PriceBias, getBankVaultAuthority } from "@mrgnlabs/marginfi-client-v2";
import {
  InstructionsWrapper,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  nativeToUi,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";
import instructions from "./instructions";
import {
  getCampaignRewardVault,
  getCampaignRewardVaultAuthority,
  getMarginfiAccount,
  getMfiPdaSigner,
  getTempTokenAccountAuthority,
} from "./utils";

export interface LipPosition {
  address: PublicKey;
  amount: number;
  usdValue: number;
  campaign: Campaign;
  startDate: Date;
  endDate: Date;
  lockupPeriodInDays: number;
}

/**
 * Wrapper class around a specific LIP account.
 */
class LipAccount {
  public campaigns: Campaign[];
  public deposits: Deposit[];

  constructor(
    readonly client: LipClient,
    readonly mfiClient: MarginfiClient,
    readonly owner: PublicKey,
    campaigns: Campaign[],
    deposits: Deposit[]
  ) {
    this.campaigns = campaigns;
    this.deposits = deposits;
  }

  // --- Factories

  static async fetch(walletPk: Address, client: LipClient, mfiClient: MarginfiClient): Promise<LipAccount> {
    const _walletPk = translateAddress(walletPk);
    const { deposits, campaigns } = await LipAccount._fetchAccountData(_walletPk, client);
    const lipAccount = new LipAccount(client, mfiClient, _walletPk, campaigns, deposits);
    require("debug")("mfi:margin-account")("Loaded marginfi account %s", _walletPk);
    return lipAccount;
  }

  getPositions(): LipPosition[] {
    return this.deposits
      .map((d) => {
        const campaign = this.campaigns.find((c) => d.campaign.equals(c.publicKey));
        if (!campaign) throw Error("Campaign not found");
        const endDate = new Date(d.startDate);
        endDate.setSeconds(endDate.getSeconds() + campaign.lockupPeriod.toNumber());
        console.log(
          shortenAddress(d.campaign),
          endDate,
          d.startDate,
          campaign.lockupPeriod.toNumber(),
          campaign.lockupPeriod.toNumber() / (24 * 60 * 60)
        );
        return {
          address: d.address,
          amount: d.amount,
          usdValue: d.usdValue,
          campaign: campaign,
          startDate: d.startDate,
          endDate,
          lockupPeriodInDays: campaign.lockupPeriod.toNumber() / (24 * 60 * 60),
        };
      })
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }

  getTotalBalance() {
    return this.deposits.reduce((acc, d) => acc.plus(d.usdValue), new BigNumber(0));
  }

  async makeClosePositionIx(lipPosition: LipPosition): Promise<InstructionsWrapper> {
    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(lipPosition.campaign.bank.mint, this.client.wallet.publicKey);
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.client.wallet.publicKey,
      userAta,
      this.client.wallet.publicKey,
      lipPosition.campaign.bank.mint
    );
    ixs.push(createAtaIdempotentIx);

    const [campaignRewardVault] = getCampaignRewardVault(lipPosition.campaign.publicKey, this.client.program.programId);
    const [campaignRewardVaultAuthority] = getCampaignRewardVaultAuthority(
      lipPosition.campaign.publicKey,
      this.client.program.programId);
    const [marginfiAccount] = getMarginfiAccount(lipPosition.address, this.client.program.programId);
    const [marginfiBankVaultAuthority] = getBankVaultAuthority(
      BankVaultType.LiquidityVault,
      lipPosition.campaign.bank.publicKey,
      this.mfiClient.programId);
    const [mfiPdaSigner] = getMfiPdaSigner(lipPosition.address, this.client.program.programId);
    const [tempTokenAccountAuthority] = getTempTokenAccountAuthority(lipPosition.address, this.client.program.programId);

    const tempTokenAccount = Keypair.generate();

    const endDepositIx = await instructions.makeEndDepositIx(this.client.program, {
      marginfiGroup: this.mfiClient.group.publicKey,
      signer: this.client.wallet.publicKey,
      assetMint: lipPosition.campaign.bank.mint,
      campaign: lipPosition.campaign.publicKey,
      campaignRewardVault,
      deposit: lipPosition.address,
      campaignRewardVaultAuthority,
      destinationAccount: userAta,
      marginfiAccount,
      marginfiBank: lipPosition.campaign.bank.publicKey,
      marginfiBankVault: lipPosition.campaign.bank.liquidityVault,
      marginfiProgram: this.mfiClient.programId,
      marginfiBankVaultAuthority,
      mfiPdaSigner,
      tempTokenAccount: tempTokenAccount.publicKey,
      tempTokenAccountAuthority,
    });
    ixs.push(endDepositIx);

    return { instructions: ixs, keys: [tempTokenAccount] };
  }

  async closePosition(deposit: LipPosition) {
    const tx = new Transaction();

    const ixs = await this.makeClosePositionIx(deposit);
    tx.add(...ixs.instructions);

    const sig = await this.client.processTransaction(tx, [], { dryRun: false });
    await this.reload();
    return sig;
  }

  /**
   * Decode marginfi account data according to the Anchor IDL.
   *
   * @param encoded Raw data buffer
   * @returns Decoded marginfi account data struct
   */
  static decode(encoded: Buffer): DepositData {
    const coder = new BorshCoder(LIP_IDL);
    return coder.accounts.decode(AccountType.Deposit, encoded);
  }

  private static async _fetchAccountData(
    owner: PublicKey,
    lipClient: LipClient
  ): Promise<{ deposits: Deposit[]; campaigns: Campaign[] }> {
    console.log("fetching deposits");
    const deposits = await lipClient.getDepositsForOwner(owner);
    await lipClient.reload();

    const relevantCampaignPks = deposits.map((d) => d.campaign.toBase58());
    const campaignsData = lipClient.campaigns.filter((c) => relevantCampaignPks.includes(c.publicKey.toBase58()));

    const processedDeposits = deposits.map((deposit) => {
      const campaign = lipClient.campaigns.find((c) => deposit.campaign.equals(c.publicKey));
      if (!campaign) throw Error("Campaign not found");
      return new Deposit(deposit, campaign.bank);
    });

    return {
      deposits: processedDeposits,
      campaigns: campaignsData,
    };
  }

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  async reload() {
    const { deposits, campaigns } = await LipAccount._fetchAccountData(this.owner, this.client);
    this.campaigns = campaigns;
    this.deposits = deposits;
  }

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  async reloadAndClone(): Promise<LipAccount> {
    await this.reload();
    return new LipAccount(this.client, this.mfiClient, this.owner, this.campaigns, this.deposits);
  }
}

export default LipAccount;

// Client types

export class Deposit {
  address: PublicKey;
  amount: number;
  usdValue: number;
  campaign: PublicKey;
  startDate: Date;

  constructor(data: DepositData, bank: Bank) {
    this.address = data.address;
    this.amount = nativeToUi(data.amount, bank.mintDecimals);
    this.usdValue = this.getUsdValue(this.amount, bank);
    this.campaign = data.campaign;
    this.startDate = new Date(data.startTime * 1000);
  }

  public getUsdValue(amount: number, bank: Bank): number {
    return bank.getUsdValue(new BigNumber(amount), PriceBias.None, new BigNumber(1), false).toNumber();
  }
}

// On-chain types

export interface DepositData {
  address: PublicKey;
  owner: PublicKey;
  amount: BN;
  startTime: number;
  campaign: PublicKey;
}

export interface CampaignData {
  publicKey: PublicKey;
  marginfiBankPk: PublicKey;
  maxDeposits: BN;
  maxRewards: BN;
  lockupPeriod: BN;
  remainingCapacity: BN;
}

export interface Campaign extends CampaignData {
  bank: Bank;
}

export enum AccountType {
  Deposit = "deposit",
  Campaign = "campaign",
}

import { Address, BN, BorshCoder, translateAddress } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { LIP_IDL } from ".";
import LipClient from "./client";
import {
  BankVaultType,
  MarginfiClient,
  PriceBias,
  OraclePrice,
  getBankVaultAuthority,
} from "@mrgnlabs/marginfi-client-v2";
import {
  InstructionsWrapper,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  nativeToUi,
} from "@mrgnlabs/mrgn-common";
import instructions from "./instructions";
import {
  computeGuaranteedApy,
  getCampaignRewardVault,
  getCampaignRewardVaultAuthority,
  getMarginfiAccount,
  getMfiPdaSigner,
  getTempTokenAccountAuthority,
} from "./utils";
import { Bank } from "@mrgnlabs/marginfi-client-v2/dist/models/bank";

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

  getTotalBalance() {
    return this.deposits.reduce((acc, deposit) => {
      const oraclePrice = this.mfiClient.oraclePrices.get(deposit.campaign.bank.address.toBase58());
      if (!oraclePrice) throw Error("Price info not found");

      return acc.plus(deposit.computeUsdValue(oraclePrice, deposit.campaign.bank));
    }, new BigNumber(0));
  }

  async makeClosePositionIx(deposit: Deposit): Promise<InstructionsWrapper> {
    let ixs = [];

    const userAta = getAssociatedTokenAddressSync(deposit.campaign.bank.mint, this.client.wallet.publicKey, true); // We allow off curve addresses here to support Fuse.
    const createAtaIdempotentIx = createAssociatedTokenAccountIdempotentInstruction(
      this.client.wallet.publicKey,
      userAta,
      this.client.wallet.publicKey,
      deposit.campaign.bank.mint
    );
    ixs.push(createAtaIdempotentIx);

    const [campaignRewardVault] = getCampaignRewardVault(deposit.campaign.publicKey, this.client.program.programId);
    const [campaignRewardVaultAuthority] = getCampaignRewardVaultAuthority(
      deposit.campaign.publicKey,
      this.client.program.programId
    );
    const [marginfiAccount] = getMarginfiAccount(deposit.address, this.client.program.programId);
    const [marginfiBankVaultAuthority] = getBankVaultAuthority(
      BankVaultType.LiquidityVault,
      deposit.campaign.bank.address,
      this.mfiClient.programId
    );
    const [mfiPdaSigner] = getMfiPdaSigner(deposit.address, this.client.program.programId);
    const [tempTokenAccountAuthority] = getTempTokenAccountAuthority(deposit.address, this.client.program.programId);

    const tempTokenAccount = Keypair.generate();

    const endDepositIx = await instructions.makeEndDepositIx(this.client.program, {
      marginfiGroup: this.mfiClient.groupAddress,
      signer: this.client.wallet.publicKey,
      assetMint: deposit.campaign.bank.mint,
      campaign: deposit.campaign.publicKey,
      campaignRewardVault,
      deposit: deposit.address,
      campaignRewardVaultAuthority,
      destinationAccount: userAta,
      marginfiAccount,
      marginfiBank: deposit.campaign.bank.address,
      marginfiBankVault: deposit.campaign.bank.liquidityVault,
      marginfiProgram: this.mfiClient.programId,
      marginfiBankVaultAuthority,
      mfiPdaSigner,
      tempTokenAccount: tempTokenAccount.publicKey,
      tempTokenAccountAuthority,
    });
    ixs.push(endDepositIx);

    return { instructions: ixs, keys: [tempTokenAccount] };
  }

  async closePosition(deposit: Deposit) {
    const tx = new Transaction();

    const ixs = await this.makeClosePositionIx(deposit);
    tx.add(...ixs.instructions);

    const sig = await this.client.processTransaction(tx, ixs.keys, { dryRun: false });
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
    const deposits = await lipClient.getDepositsForOwner(owner);
    await lipClient.reload();

    const relevantCampaignPks = deposits.map((d) => d.campaign.toBase58());
    const campaignsData = lipClient.campaigns.filter((c) => relevantCampaignPks.includes(c.publicKey.toBase58()));

    const shapedDeposits = deposits.map((deposit) => {
      const campaign = lipClient.campaigns.find((c) => deposit.campaign.equals(c.publicKey));
      if (!campaign) throw Error("Campaign not found");

      const bank = lipClient.mfiClient.banks.get(campaign.bank.address.toBase58());
      if (!bank) throw Error("Bank not found");

      return Deposit.fromAccountParsed(deposit, bank, campaign);
    });

    return {
      deposits: shapedDeposits,
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
  public address: PublicKey;
  public amount: number;
  public campaign: Campaign;
  public startDate: Date;

  constructor(address: PublicKey, amount: number, campaign: Campaign, startDate: Date) {
    this.address = address;
    this.amount = amount;
    this.campaign = campaign;
    this.startDate = startDate;
  }

  get endDate(): Date {
    const endDate = new Date(this.startDate);
    endDate.setSeconds(endDate.getSeconds() + this.campaign.lockupPeriod);
    return endDate;
  }

  get maturityAmount(): number {
    return this.amount + (this.amount / this.campaign.maxDeposits) * this.campaign.maxRewards;
  }

  get lockupPeriodInDays(): number {
    return this.campaign.lockupPeriod / 60 / 60 / 24;
  }

  public computeUsdValue(oraclePrice: OraclePrice, bank: Bank): number {
    return bank
      .computeUsdValue(oraclePrice, BigNumber(this.amount), PriceBias.None, false, new BigNumber(1), false)
      .toNumber();
  }

  static fromAccountParsed(data: DepositData, bank: Bank, campaign: Campaign): Deposit {
    return new Deposit(
      data.address,
      nativeToUi(data.amount, bank.mintDecimals),
      campaign,
      new Date(data.startTime * 1000)
    );
  }
}

export class Campaign {
  publicKey: PublicKey;
  maxDeposits: number;
  maxRewards: number;
  lockupPeriod: number;
  remainingCapacity: number;
  guaranteedApy: number;

  constructor(readonly bank: Bank, readonly oraclePrice: OraclePrice, data: CampaignData) {
    this.publicKey = data.publicKey;
    this.maxDeposits = nativeToUi(data.maxDeposits, bank.mintDecimals);
    this.maxRewards = nativeToUi(data.maxRewards, bank.mintDecimals);
    this.lockupPeriod = data.lockupPeriod.toNumber();
    this.remainingCapacity = nativeToUi(data.remainingCapacity, bank.mintDecimals);
    this.guaranteedApy = this.computeGuaranteedApyForCampaign();
  }

  computeGuaranteedApyForCampaign(): number {
    return computeGuaranteedApy(this.lockupPeriod, this.maxDeposits, this.maxRewards);
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

export enum AccountType {
  Deposit = "deposit",
  Campaign = "campaign",
}

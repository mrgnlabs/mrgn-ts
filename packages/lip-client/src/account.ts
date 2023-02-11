import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { LIP_IDL } from ".";
import LipClient from "./client";
import Bank, { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

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
    return this.deposits.reduce((acc, d) => acc.plus(d.usdValue), new BigNumber(0));
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
  amount: number;
  usdValue: number;

  constructor(data: DepositData, bank: Bank) {
    this.amount = nativeToUi(data.amount, bank.mintDecimals);
    this.usdValue = this.getUsdValue(this.amount, bank);
  }

  public getUsdValue(amount: number, bank: Bank): number {
    return bank.getUsdValue(new BigNumber(amount), PriceBias.None, new BigNumber(1), false).toNumber();
  }
}

// On-chain types

export interface DepositData {
  owner: PublicKey;
  amount: BN;
  startTime: number;
  campaign: PublicKey;
}

export interface CampaignData {
  publicKey: PublicKey;
  marginfiBankPk: PublicKey;
}

export interface Campaign extends CampaignData {
  bank: Bank;
}

// {
//   "name": "admin",
//   "type": "publicKey",
// },
// {
//   "name": "lockupPeriod",
//   "type": "u64",
// },
// {
//   "name": "active",
//   "type": "bool",
// },
// {
//   "name": "maxDeposits",
//   "type": "u64",
// },
// {
//   "name": "remainingCapacity",
//   "type": "u64",
// },
// {
//   "name": "maxRewards",
//   "type": "u64",
// },
// {
//   "name": "marginfiBankPk",
//   "type": "publicKey",
// },
// {
//   "name": "padding",
//   "type": {
//   "array": [
//     "u64",
//     16,
//   ],
// },
// },

export enum AccountType {
  Deposit = "deposit",
  Campaign = "campaign",
}

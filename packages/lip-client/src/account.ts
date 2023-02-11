import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { LIP_IDL } from ".";
import LipClient from "./client";
import Bank, { BankData, PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

/**
 * Wrapper class around a specific marginfi account.
 */
class LipAccount {
  public campaigns: Campaign[];
  public deposits: Deposit[];

  constructor(
    readonly client: LipClient,
    readonly mfiClient: MarginfiClient,
    readonly owner: PublicKey,
    campaigns: Campaign[],
    deposits: Deposit[],
  ) {
    this.campaigns = campaigns;
    this.deposits = deposits;
  }

  // --- Getters / Setters

  /** @internal */
  private get _program() {
    return this.client.program;
  }

  // --- Factories

  static async fetch(walletPk: Address, client: LipClient, mfiClient: MarginfiClient): Promise<LipAccount> {
    const { program } = client;
    const _walletPk = translateAddress(walletPk);

    const deposits = await client.getDepositsForOwner(_walletPk);

    const relevantCampaignPks = deposits.map((d) => d.campaign.toBase58());
    const campaignsData = client.campaigns.filter((c) => relevantCampaignPks.includes(c.publicKey.toBase58()));

    const relevantBanks = campaignsData.map((d) => d.marginfiBankPk);
    const banksWithNulls = await mfiClient.program.account.bank.fetchMultiple(relevantBanks);
    const banksData = banksWithNulls.filter((c) => c !== null) as BankData[];

    const pythAccounts = await program.provider.connection.getMultipleAccountsInfo(
      banksData.map((b) => (b as BankData).config.oracleKeys[0]),
    );

    const banks = banksData.map(
      (bd, index) =>
        new Bank(
          mfiClient.config.banks[index].label,
          relevantBanks[index],
          bd as BankData,
          parsePriceData(pythAccounts[index]!.data),
        ),
    );

    const processedDeposits = deposits.map((deposit) => {
      const campaign = client.campaigns.find((c) => deposit.campaign.equals(c.publicKey));
      if (!campaign) throw Error("Campaign not found");
      const bank = banks.find((b) => b.publicKey.equals(campaign.marginfiBankPk));
      if (!bank) throw Error("Bank not found");
      return new Deposit(deposit, bank);
    });

    const campaigns = client.campaigns.map((campaign) => {
      const bank = mfiClient.group.getBankByPk(campaign.marginfiBankPk);
      if (!bank) throw Error("Bank not found");
      return { ...campaign, bank };
    });

    const marginfiAccount = new LipAccount(client, mfiClient, _walletPk, campaigns, processedDeposits);

    require("debug")("mfi:margin-account")("Loaded marginfi account %s", _walletPk);

    return marginfiAccount;
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

  /**
   * Update instance data by fetching and storing the latest on-chain state.
   */
  async reload() {
    const deposits = await this.client.getDepositsForOwner(this.owner);
    console.log("deposits", deposits.length);
    const relevantCampaignPks = deposits.map((d) => d.campaign.toBase58());
    const campaignsData = this.client.campaigns.filter((c) => relevantCampaignPks.includes(c.publicKey.toBase58()));

    const relevantBanks = campaignsData.map((d) => d.marginfiBankPk);
    const banksWithNulls = await this.mfiClient.program.account.bank.fetchMultiple(relevantBanks);
    const banksData = banksWithNulls.filter((c) => c !== null) as BankData[];

    const pythAccounts = await this._program.provider.connection.getMultipleAccountsInfo(
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

    const processedDeposits = deposits.map((deposit) => {
      const campaign = this.client.campaigns.find((c) => deposit.campaign.equals(c.publicKey));
      if (!campaign) throw Error("Campaign not found");
      const bank = banks.find((b) => b.publicKey.equals(campaign.marginfiBankPk));
      if (!bank) throw Error("Bank not found");
      return new Deposit(deposit, bank);
    });

    this.campaigns = this.client.campaigns.map((campaign) => {
      const bank = this.mfiClient.group.getBankByPk(campaign.marginfiBankPk);
      if (!bank) throw Error("Bank not found");
      return { ...campaign, bank };
    });
    this.deposits = processedDeposits;

    console.log(this.getTotalBalance().toNumber());
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

import { Address, BN, BorshCoder, translateAddress } from "@project-serum/anchor";
import { parsePriceData } from "@pythnetwork/client";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { LIP_IDL } from ".";
import LipClient from "./client";
import Bank, { BankData, PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { MarginfiClientReadonly, nativeToUi } from "@mrgnlabs/marginfi-client-v2";

/**
 * Wrapper class around a specific marginfi account.
 */
class LipAccount {
  /**
   * @internal
   */
  private constructor(readonly client: LipClient, readonly deposits: Deposit[]) {
  }

  // --- Getters / Setters

  /** @internal */
  private get _program() {
    return this.client.program;
  }

  /** @internal */
  private get _config() {
    return this.client.config;
  }

  // --- Factories

  static async fetch(walletPk: Address, client: LipClient, mfiClient: MarginfiClientReadonly): Promise<LipAccount> {
    const { program } = client;
    const _marginfiAccountPk = translateAddress(walletPk);

    const deposits = await client.getDepositsForOwner(_marginfiAccountPk);

    const relevantCampaigns = deposits.map((d) => d.campaign);
    const campaignsWithNulls = await program.account.campaign.fetchMultiple(relevantCampaigns);
    const campaigns = campaignsWithNulls.filter((c) => c !== null) as CampaignData[];

    const relevantBanks = campaigns.map((d) => d.marginfiBankPk);
    const banksWithNulls = await mfiClient.program.account.bank.fetchMultiple(relevantBanks);
    const banksData = banksWithNulls.filter((c) => c !== null) as BankData[];

    if (deposits.length !== campaigns.length || deposits.length !== banksData.length) {
      return Promise.reject("Some of the accounts were not found");
    }

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

    const zippedDeposits = deposits.map(function(deposit, i) {
      return { deposit, campaign: campaigns[i], bank: banks[i] };
    });

    console.log(zippedDeposits);

    const processedDeposits = zippedDeposits.map(({ deposit, campaign, bank }) => {
      return new Deposit(deposit, bank);
    });

    const marginfiAccount = new LipAccount(
      client,
      processedDeposits,
    );

    require("debug")("mfi:margin-account")("Loaded marginfi account %s", _marginfiAccountPk);

    return marginfiAccount;
  }

  // /**
  //  * MarginfiAccount local factory (decoded)
  //  *
  //  * Instantiate a MarginfiAccount according to the provided decoded data.
  //  * Check sanity against provided config.
  //  *
  //  * @param marginfiAccountPk Address of the target account
  //  * @param client marginfi client
  //  * @param accountData Decoded marginfi marginfi account data
  //  * @param marginfiGroup MarginfiGroup instance
  //  * @returns MarginfiAccount instance
  //  */
  // static fromAccountData(
  //   marginfiAccountPk: Address,
  //   client: MarginfiClient,
  //   accountData: MarginfiAccountData,
  //   marginfiGroup: MarginfiGroup,
  // ) {
  //   if (!accountData.group.equals(client.config.groupPk))
  //     throw Error(
  //       `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`,
  //     );
  //
  //   const _marginfiAccountPk = translateAddress(marginfiAccountPk);
  //
  //   return new MarginfiAccount(_marginfiAccountPk, client, marginfiGroup, accountData);
  // }
  //
  // /**
  //  * MarginfiAccount local factory (encoded)
  //  *
  //  * Instantiate a MarginfiAccount according to the provided encoded data.
  //  * Check sanity against provided config.
  //  *
  //  * @param marginfiAccountPk Address of the target account
  //  * @param client marginfi client
  //  * @param marginfiAccountRawData Encoded marginfi marginfi account data
  //  * @param marginfiGroup MarginfiGroup instance
  //  * @returns MarginfiAccount instance
  //  */
  // static fromAccountDataRaw(
  //   marginfiAccountPk: PublicKey,
  //   client: MarginfiClient,
  //   marginfiAccountRawData: Buffer,
  //   marginfiGroup: MarginfiGroup,
  // ) {
  //   const marginfiAccountData = MarginfiAccount.decode(marginfiAccountRawData);
  //
  //   return MarginfiAccount.fromAccountData(marginfiAccountPk, client, marginfiAccountData, marginfiGroup);
  // }
  //
  // // --- Others
  //
  // /**
  //  * Fetch marginfi account data.
  //  * Check sanity against provided config.
  //  *
  //  * @param accountAddress account address
  //  * @param config marginfi config
  //  * @param program marginfi Anchor program
  //  * @param commitment commitment override
  //  * @returns Decoded marginfi account data struct
  //  */
  // private static async _fetchAccountData(
  //   accountAddress: Address,
  //   config: MarginfiConfig,
  //   program: LipProgram,
  //   commitment?: Commitment,
  // ): Promise<MarginfiAccountData> {
  //   const mergedCommitment = commitment ?? program.provider.connection.commitment ?? DEFAULT_COMMITMENT;
  //
  //   const data: MarginfiAccountData = (await program.account.marginfiAccount.fetch(
  //     accountAddress,
  //     mergedCommitment,
  //   )) as any;
  //
  //   if (!data.group.equals(config.groupPk))
  //     throw Error(`Marginfi account tied to group ${data.group.toBase58()}. Expected: ${config.groupPk.toBase58()}`);
  //
  //   return data;
  // }

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
  // async reload() {
  //   const [marginfiGroupAi, marginfiAccountAi] = await this._loadGroupAndAccountAi();
  //   const marginfiAccountData = MarginfiAccount.decode(marginfiAccountAi.data);
  //   if (!marginfiAccountData.group.equals(this._config.groupPk))
  //     throw Error(
  //       `Marginfi account tied to group ${marginfiAccountData.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`,
  //     );
  //
  //   const bankAddresses = this._config.banks.map((b) => b.address);
  //   let bankAccountsData = await this._program.account.bank.fetchMultiple(bankAddresses);
  //
  //   let nullAccounts = [];
  //   for (let i = 0; i < bankAccountsData.length; i++) {
  //     if (bankAccountsData[i] === null) nullAccounts.push(bankAddresses[i]);
  //   }
  //   if (nullAccounts.length > 0) {
  //     throw Error(`Failed to fetch banks ${nullAccounts}`);
  //   }
  //
  //   const pythAccounts = await this._program.provider.connection.getMultipleAccountsInfo(
  //     bankAccountsData.map((b) => (b as BankData).config.oracleKeys[0]),
  //   );
  //
  //   const banks = bankAccountsData.map(
  //     (bd, index) =>
  //       new Bank(
  //         this._config.banks[index].label,
  //         bankAddresses[index],
  //         bd as BankData,
  //         parsePriceData(pythAccounts[index]!.data),
  //       ),
  //   );
  //
  //   this._group = MarginfiGroup.fromAccountDataRaw(this._config, this._program, marginfiGroupAi.data, banks);
  //   this._updateFromAccountData(marginfiAccountData);
  // }
  //
  // /**
  //  * Update instance data from provided data struct.
  //  *
  //  * @param data Marginfi account data struct
  //  */
  // private _updateFromAccountData(data: DepositData) {
  //   this._authority = data.authority;
  //
  //   // TODO
  // }

//   private async _loadGroupAndAccountAi(): Promise<AccountInfo<Buffer>[]> {
//     const debug = require("debug")(`mfi:margin-account:${this.publicKey.toString()}:loader`);
//     debug("Loading marginfi account %s, and group %s", this.publicKey, this._config.groupPk);
//
//     let [marginfiGroupAi, marginfiAccountAi] = await this.client.provider.connection.getMultipleAccountsInfo(
//       [this._config.groupPk, this.publicKey],
//       DEFAULT_COMMITMENT,
//     );
//
//     if (!marginfiAccountAi) {
//       throw Error("Marginfi account no found");
//     }
//     if (!marginfiGroupAi) {
//       throw Error("Marginfi Group Account no found");
//     }
//
//     return [marginfiGroupAi, marginfiAccountAi];
//   }
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
  marginfiBankPk: PublicKey;
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
  Canpaign = "campaign",
}

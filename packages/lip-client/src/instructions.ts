import { AccountMeta, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { LipProgram } from "./types";

async function makeCreateCampaingIx(
  lipProgram: LipProgram,
  accounts: {
    campaign: PublicKey;
    campaignRewardVault: PublicKey;
    campaignRewardVaultAuthority: PublicKey;
    assetMint: PublicKey;
    marginfiBank: PublicKey;
    admin: PublicKey;
    fundingAccount: PublicKey;
    rent: PublicKey;
    tokenProgram: PublicKey;
  },
  args: {
    lockupPeriod: BN;
    maxDeposits: BN;
    maxRewards: BN;
  }
) {
  return lipProgram.methods
    .createCampaing(
        args.lockupPeriod,
        args.maxDeposits,
        args.maxRewards,
    )
    .accounts({
        campaign: accounts.campaign,
        campaignRewardVault: accounts.campaignRewardVault,
        campaignRewardVaultAuthority: accounts.campaignRewardVaultAuthority,
        assetMint: accounts.assetMint,
        marginfiBank: accounts.marginfiBank,
        admin: accounts.admin,
        fundingAccount: accounts.fundingAccount,
        rent: accounts.rent,
        tokenProgram: accounts.tokenProgram,
        systemProgram: SystemProgram.programId,
    })
    .instruction();
}

async function makeCreateDepositIx(
    lipProgram: LipProgram,
    accounts: {
      campaign: PublicKey;
      signer: PublicKey;
      deposit: PublicKey;
      mfiPdaSigner: PublicKey;
      fundingAccount: PublicKey;
      tempTokenAccount: PublicKey;
      assetMint: PublicKey;
      marginfiGroup: PublicKey;
      marginfiBank: PublicKey;
      marginfiAccount: PublicKey;
      marginfiBankVault: PublicKey;
      marginfiProgram: PublicKey;
      tokenProgram: PublicKey;
      rent: PublicKey;
    },
    args: {
      amount: BN;
    }
  ) {
    return lipProgram.methods
      .createDeposit(args.amount)
      .accounts({
        campaign: accounts.campaign,
        signer: accounts.signer,
        deposit: accounts.deposit,
        mfiPdaSigner: accounts.mfiPdaSigner,
        fundingAccount: accounts.fundingAccount,
        tempTokenAccount: accounts.tempTokenAccount,
        assetMint: accounts.assetMint,
        marginfiGroup: accounts.marginfiGroup,
        marginfiBank: accounts.marginfiBank,
        marginfiAccount: accounts.marginfiAccount,
        marginfiBankVault: accounts.marginfiBankVault,
        marginfiProgram: accounts.marginfiProgram,
        tokenProgram: accounts.tokenProgram,
        rent: accounts.rent,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
}

async function makeEndDepositIx(
    lipProgram: LipProgram,
    accounts: {
      campaign: PublicKey;
      campaignRewardVault: PublicKey;
      campaignRewardVaultAuthority: PublicKey;
      signer: PublicKey;
      deposit: PublicKey;
      mfiPdaSigner: PublicKey;
      tempTokenAccount: PublicKey;
      tempTokenAccountAuthority: PublicKey;
      destinationAccount: PublicKey;
      assetMint: PublicKey;
      marginfiAccount: PublicKey;
      marginfiGroup: PublicKey;
      marginfiBank: PublicKey;
      marginfiBankVault: PublicKey;
      marginfiBankVaultAuthority: PublicKey;
      marginfiProgram: PublicKey;
      tokenProgram: PublicKey;
    },
  ) {
    return lipProgram.methods
      .endDeposit()
      .accounts({
          campaign: accounts.campaign,
          campaignRewardVault: accounts.campaignRewardVault,
          campaignRewardVaultAuthority: accounts.campaignRewardVaultAuthority,
          signer: accounts.signer,
          deposit: accounts.deposit,
          mfiPdaSigner: accounts.mfiPdaSigner,
          tempTokenAccount: accounts.tempTokenAccount,
          tempTokenAccountAuthority: accounts.tempTokenAccountAuthority,
          destinationAccount: accounts.destinationAccount,
          assetMint: accounts.assetMint,
          marginfiAccount: accounts.marginfiAccount,
          marginfiGroup: accounts.marginfiGroup,
          marginfiBank: accounts.marginfiBank,
          marginfiBankVault: accounts.marginfiBankVault,
          marginfiBankVaultAuthority: accounts.marginfiBankVaultAuthority,
          marginfiProgram: accounts.marginfiProgram,
          tokenProgram: accounts.tokenProgram,
          systemProgram: SystemProgram.programId,
      })
      .instruction();
  }  

const instructions = {
    makeCreateCampaingIx,
    makeCreateDepositIx,
    makeEndDepositIx,
  };
  
  export default instructions;
  
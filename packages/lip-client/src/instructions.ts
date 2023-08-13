import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { LipProgram } from "./types";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

async function makeCreateDepositIx(
  lipProgram: LipProgram,
  accounts: {
    campaign: PublicKey;
    signer: PublicKey;
    fundingAccount: PublicKey;
    tempTokenAccount: PublicKey;
    assetMint: PublicKey;
    marginfiGroup: PublicKey;
    marginfiBank: PublicKey;
    marginfiBankVault: PublicKey;
    marginfiProgram: PublicKey;
    deposit: PublicKey;
    mfiPdaSigner: PublicKey;
    marginfiAccount: PublicKey;
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
      fundingAccount: accounts.fundingAccount,
      tempTokenAccount: accounts.tempTokenAccount,
      assetMint: accounts.assetMint,
      marginfiGroup: accounts.marginfiGroup,
      marginfiBank: accounts.marginfiBank,
      marginfiBankVault: accounts.marginfiBankVault,
      marginfiProgram: accounts.marginfiProgram,
      deposit: accounts.deposit,
      mfiPdaSigner: accounts.mfiPdaSigner,
      marginfiAccount: accounts.marginfiAccount,
    })
    .instruction();
}

async function makeEndDepositIx(
  lipProgram: LipProgram,
  accounts: {
    campaign: PublicKey;
    signer: PublicKey;
    tempTokenAccount: PublicKey;
    assetMint: PublicKey;
    marginfiGroup: PublicKey;
    marginfiBank: PublicKey;
    marginfiBankVault: PublicKey;
    marginfiProgram: PublicKey;
    deposit: PublicKey;
    mfiPdaSigner: PublicKey;
    marginfiAccount: PublicKey;
    campaignRewardVault: PublicKey;
    campaignRewardVaultAuthority: PublicKey;
    destinationAccount: PublicKey;
    marginfiBankVaultAuthority: PublicKey;
    tempTokenAccountAuthority: PublicKey;
  }
) {
  return lipProgram.methods
    .endDeposit()
    .accountsStrict({
      campaign: accounts.campaign,
      signer: accounts.signer,
      campaignRewardVault: accounts.campaignRewardVault,
      campaignRewardVaultAuthority: accounts.campaignRewardVaultAuthority,
      destinationAccount: accounts.destinationAccount,
      marginfiBankVaultAuthority: accounts.marginfiBankVaultAuthority,
      tempTokenAccountAuthority: accounts.tempTokenAccountAuthority,
      tempTokenAccount: accounts.tempTokenAccount,
      assetMint: accounts.assetMint,
      marginfiGroup: accounts.marginfiGroup,
      marginfiBank: accounts.marginfiBank,
      marginfiBankVault: accounts.marginfiBankVault,
      marginfiProgram: accounts.marginfiProgram,
      deposit: accounts.deposit,
      mfiPdaSigner: accounts.mfiPdaSigner,
      marginfiAccount: accounts.marginfiAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

const instructions = {
  makeCreateDepositIx,
  makeEndDepositIx,
};

export default instructions;

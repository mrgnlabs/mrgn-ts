import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { LipProgram } from "./types";

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
  },
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

const instructions = {
  makeCreateDepositIx,
};

export default instructions;

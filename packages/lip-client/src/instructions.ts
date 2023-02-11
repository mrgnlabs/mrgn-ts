import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { LipProgram } from "./types";

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
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
}

const instructions = {
    makeCreateDepositIx,
  };
  
export default instructions;

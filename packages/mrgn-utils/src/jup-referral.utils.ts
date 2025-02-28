import { ReferralProvider } from "@jup-ag/referral-sdk";
import { InstructionsWrapper } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";

export const TOKEN_2022_MINTS = ["2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"];
export const REFERRAL_PROGRAM_ID = new PublicKey("REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3");
export const REFERRAL_ACCOUNT_PUBKEY = new PublicKey("Mm7HcujSK2JzPW4eX7g4oqTXbWYDuFxapNMHXe8yp1B");

export async function createReferalTokenAccountIxs(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey
): Promise<TransactionInstruction[]> {
  const provider = new ReferralProvider(connection);

  const { tx, referralTokenAccountPubKey } = await provider.initializeReferralTokenAccount({
    payerPubKey: payer,
    referralAccountPubKey: REFERRAL_ACCOUNT_PUBKEY,
    mint,
  });

  const accountInfo = await connection.getAccountInfo(referralTokenAccountPubKey);

  if (accountInfo) {
    return [];
  }

  console.log("tx", tx);

  return tx.instructions;
}

export const getFeeAccount = (mint: PublicKey) => {
  const referralProgramPubkey = REFERRAL_PROGRAM_ID;
  const referralAccountPubkey = REFERRAL_ACCOUNT_PUBKEY;

  const [feeAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("referral_ata"), referralAccountPubkey.toBuffer(), mint.toBuffer()],
    referralProgramPubkey
  );
  return feeAccount.toBase58();
};

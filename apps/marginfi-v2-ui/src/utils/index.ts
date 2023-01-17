import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "./spl";
import BN from "bn.js";

export const groupedNumberFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});


// ================ apr/apy formatters ================

const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param interest {Number} APY as percentage (ie. 6)
 * @param frequency {Number} Compounding frequency (times a year)
 * @returns {Number} APR as percentage (ie. 5.82 for APY of 6%)
 */
export const apyToAprFormatter = (interest: number, frequency = SECONDS_PER_YEAR) => ((1 + (interest / 100)) ** (1 / frequency) - 1) * frequency * 100;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param interest {Number} APR as percentage (ie. 5.82)
 * @param frequency {Number} Compounding frequency (times a year)
 * @returns {Number} APY as percentage (ie. 6 for APR of 5.82%)
 */
export const aprToApyFormatter = (interest: number, frequency = SECONDS_PER_YEAR) => ((1 + (interest / 100) / frequency) ** frequency - 1) * 100;

// ================ development utils ================

export const FAUCET_PROGRAM_ID = new PublicKey(
  "4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt"
);

export function makeAirdropCollateralIx(
  amount: number,
  mint: PublicKey,
  tokenAccount: PublicKey,
  faucet: PublicKey
): TransactionInstruction {
  const [faucetPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("faucet")],
    FAUCET_PROGRAM_ID
  );

  const keys = [
    { pubkey: faucetPda, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: faucet, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: FAUCET_PROGRAM_ID,
    data: Buffer.from([1, ...new BN(amount).toArray("le", 8)]),
    keys,
  });
}

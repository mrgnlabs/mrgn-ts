import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { array, assert, Infer, number, object, string } from "superstruct";
import { TokenMetadata } from "~/types";
import tokenInfos from "../assets/token_info.json";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

export function floor(value: number, decimals: number): number {
  return Math.floor(value * 10 ** decimals) / 10 ** decimals;
}

export function ceil(value: number, decimals: number): number {
  return Math.ceil(value * 10 ** decimals) / 10 ** decimals;
}

// ================ token metadata ================

const TokenMetadataRaw = object({
  address: string(),
  chainId: number(),
  decimals: number(),
  name: string(),
  symbol: string(),
  logoURI: string(),
  extensions: object(),
});
const TokenMetadataList = array(TokenMetadataRaw);

export type TokenMetadataRaw = Infer<typeof TokenMetadataRaw>;
export type TokenMetadataListRaw = Infer<typeof TokenMetadataList>;

function parseTokenMetadata(tokenMetadataRaw: TokenMetadataRaw): TokenMetadata {
  return {
    icon: tokenMetadataRaw.logoURI,
  };
}

function parseTokenMetadatas(tokenMetadataListRaw: TokenMetadataListRaw): {
  [symbol: string]: TokenMetadata;
} {
  return tokenMetadataListRaw.reduce(
    (config, current, _) => ({
      [current.symbol]: parseTokenMetadata(current),
      ...config,
    }),
    {} as {
      [symbol: string]: TokenMetadata;
    }
  );
}

export async function loadTokenMetadatas(): Promise<{
  [symbol: string]: TokenMetadata;
}> {
  const response = await fetch(`http://34.36.156.131/mrgn-token-metadata-cache.json`, {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });

  if (response.status === 200) {
    const responseData = await response.json();
    assert(responseData, TokenMetadataList);
    return parseTokenMetadatas(responseData);
  } else {
    assert(tokenInfos, TokenMetadataList);
    return parseTokenMetadatas(tokenInfos);
  }
}

// ================ development utils ================

export const FAUCET_PROGRAM_ID = new PublicKey("4bXpkKSV8swHSnwqtzuboGPaPDeEgAn4Vt8GfarV5rZt");

export function makeAirdropCollateralIx(
  amount: number,
  mint: PublicKey,
  tokenAccount: PublicKey,
  faucet: PublicKey
): TransactionInstruction {
  const [faucetPda] = PublicKey.findProgramAddressSync([Buffer.from("faucet")], FAUCET_PROGRAM_ID);

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

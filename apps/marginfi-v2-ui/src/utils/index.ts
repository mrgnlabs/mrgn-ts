import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { array, assert, Infer, number, object, string } from "superstruct";
import { TokenMetadata } from "~/types";
import tokenInfos from "../assets/token_info.json";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { Metadata, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

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
  extensions: object({
    coingeckoId: string(),
  }),
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

export async function loadTokenMetadatas(
  mints: PublicKey[],
  connection: Connection
): Promise<{
  [symbol: string]: TokenMetadata;
}> {
  assert(tokenInfos, TokenMetadataList);
  const missingTokens = mints.filter((mint) => !tokenInfos.some(({ address: mint2 }) => mint.toString() === mint2));
  const missingTokensMetadata = await fetchTokenMetadata(missingTokens, connection);

  return parseTokenMetadatas(tokenInfos.concat(missingTokensMetadata));
}

export async function fetchTokenMetadata(mints: PublicKey[], connection: Connection) {
  const mintPdas = mints.map(
    (mint) =>
      PublicKey.findProgramAddressSync([Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mint.toBuffer()], PROGRAM_ID)[0]
  );

  const tokensMetadataJson = Object.fromEntries(
    (
      await Promise.all(
        mintPdas
          .map((mintPda, idx) =>
            Metadata.fromAccountAddress(connection, mintPda).then((tokenMetadata) =>
              fetch(tokenMetadata.data.uri).then((tokenMetadataRaw) => tokenMetadataRaw.json())
            )
          )
          .map((p) => p.catch((e) => undefined))
      )
    ).map((tokenMetaData, idx) => [mints[idx].toString(), tokenMetaData])
  );

  const tokenDecimals = Object.fromEntries(
    (await Promise.all(mints.map((mint) => connection.getTokenSupply(mint).then((v) => v.value.decimals)))).map(
      (tokenSupply, idx) => [mints[idx].toString(), tokenSupply]
    )
  );

  const tokensMetadataParsed = Object.keys(tokensMetadataJson).flatMap((mint) => {
    const tokenMetadata = tokensMetadataJson[mint];

    if (!tokenMetadata) {
      console.error(`details for mint ${mint} not found`);
    }

    return tokenMetadata
      ? ({
          symbol: tokenMetadata.symbol,
          address: mint,
          chainId: 101,
          decimals: tokenDecimals[mint],
          name: tokenMetadata.name,
          logoURI: tokenMetadata.image,
          extensions: { coingeckoId: "" },
        } as TokenMetadataRaw)
      : [];
  });

  assert(tokensMetadataParsed, TokenMetadataList);

  return tokensMetadataParsed;
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

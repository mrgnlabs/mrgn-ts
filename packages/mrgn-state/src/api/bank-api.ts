import { PublicKey } from "@solana/web3.js";
import { fetchMultipleBanks, fetchOracleData, OraclePrice, PythPushFeedIdMap } from "@mrgnlabs/marginfi-client-v2";
import { getConfig } from "../config/app.config";
import { BankRaw } from "@mrgnlabs/marginfi-client-v2";
import { BankMetadata } from "@mrgnlabs/mrgn-common";
import { Address } from "@coral-xyz/anchor";

export interface BankRawDatas {
  address: PublicKey;
  data: BankRaw;
}

export const fetchRawBanks = async (addresses: Address[]): Promise<BankRawDatas[]> => {
  const program = getConfig().program;
  const banks = await fetchMultipleBanks(program, { bankAddresses: addresses });
  return banks;
};

export interface MintData {
  address: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
}

export const fetchMintData = async (addresses: Address[]): Promise<MintData[]> => {
  // Split addresses into chunks of 100
  const chunks: Address[][] = [];
  for (let i = 0; i < addresses.length; i += 100) {
    chunks.push(addresses.slice(i, i + 100));
  }

  // Fetch all chunks in parallel
  const responses = await Promise.all(
    chunks.map((chunk) =>
      fetch("/api/bankData/mintData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "max-age=86400",
        },
        body: JSON.stringify({ mints: chunk.map((addr) => addr.toString()) }),
      })
    )
  );

  const mintDatas = (
    (await Promise.all(responses.map((response) => response.json()))) as {
      tokenProgram: string;
      decimals: number;
      mint: string;
    }[]
  )
    .flat()
    .map((d) => {
      return {
        address: new PublicKey(d.mint),
        decimals: d.decimals,
        tokenProgram: new PublicKey(d.tokenProgram),
      };
    });
  return mintDatas;
};

export const fetchOraclePrices = async (
  banks: BankRawDatas[],
  bankMetadataMap: { [address: string]: BankMetadata }
): Promise<{ oracleMap: Map<string, OraclePrice>; pythFeedIdMap: PythPushFeedIdMap }> => {
  const connection = getConfig().connection;
  const oracleData = await fetchOracleData(banks, connection, bankMetadataMap, { useApiEndpoint: true });
  return { oracleMap: oracleData.bankOraclePriceMap, pythFeedIdMap: oracleData.pythFeedMap };
};

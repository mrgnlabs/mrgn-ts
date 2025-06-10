import { PublicKey } from "@solana/web3.js";
import { fetchMultipleBanks, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { getConfig } from "../config/app.config";
import { BankRaw } from "@mrgnlabs/marginfi-client-v2";

export interface BankRawDatas {
  address: PublicKey;
  data: BankRaw;
}

export const fetchRawBanks = async (addresses: PublicKey[]): Promise<BankRawDatas[]> => {
  const program = getConfig().program;
  const banks = await fetchMultipleBanks(program, { bankAddresses: addresses });
  return banks;
};

export interface MintData {
  address: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
}

export const fetchMintData = async (addresses: PublicKey[]): Promise<MintData[]> => {
  // Split addresses into chunks of 100
  const chunks: PublicKey[][] = [];
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
        body: JSON.stringify({ mints: chunk.map((addr) => addr.toBase58()) }),
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

type PythFeedMapResponse = Record<
  string,
  {
    feedId: string;
    shardId?: number;
  }
>;

export const fetchOraclePricesaaa = async (banks: BankRawDatas[]) => {
  const program = getConfig().program;

  const pythLegacyBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "pythLegacy" in bank.data.config.oracleSetup
  );
  const pythPushBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "pythPushOracle" in bank.data.config.oracleSetup
  );
  const pythStakedCollateralBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "stakedWithPythPush" in bank.data.config.oracleSetup
  );

  const pythFeedMap = await fetch(
    "/api/bankData/pythFeedMap?feedIds=" +
      pythPushBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()).join(",")
  );

  if (!pythFeedMap.ok) {
    throw new Error("Failed to fetch pyth feed map");
  }

  const pythFeedMapJson: PythFeedMapResponse = await pythFeedMap.json();

  const pythOracleKeys = [
    ...pythLegacyBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()),
    ...pythPushBanks.map((bank) => pythFeedMapJson[bank.data.config.oracleKeys[0].toBuffer().toString("hex")].feedId),
  ];

  console.log("pythOracleKeys", pythOracleKeys);

  const pythOracleDataPromise = await fetch("/api/bankData/pythOracleData?pythOracleKeys=" + pythOracleKeys.join(","));

  if (!pythOracleDataPromise.ok) {
    throw new Error("Failed to fetch pyth oracle data");
  }

  const pythOracleData = await pythOracleDataPromise.json();

  console.log("pythOracleData", pythOracleData);

  const switchboardBanks = banks.filter(
    (bank) =>
      bank.data.config.oracleSetup &&
      ("switchboardV2" in bank.data.config.oracleSetup || "switchboardPull" in bank.data.config.oracleSetup)
  );

  const addresses = pythOracleKeys;

  // const oraclePrices = await fetchMultipleOraclePrices(program, { bankAddresses: addresses });
  // return oraclePrices;
};

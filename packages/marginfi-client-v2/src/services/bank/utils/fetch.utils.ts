import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { MarginfiProgram } from "../../../types";
import { BankRaw } from "../types";
import { buildFeedIdMap, PythPushFeedIdMap } from "../../../utils";
import BigNumber from "bignumber.js";
import { OraclePrice, PriceWithConfidence } from "../../price";
import { BankMetadata } from "@mrgnlabs/mrgn-common";

export const fetchMultipleBanks = async (
  program: MarginfiProgram,
  opts?: { bankAddresses?: PublicKey[]; groupAddress?: PublicKey }
): Promise<{ address: PublicKey; data: BankRaw }[]> => {
  let bankDatas: { address: PublicKey; data: BankRaw }[] = [];

  if (opts?.bankAddresses && opts.bankAddresses.length > 0) {
    const addresses = opts.bankAddresses;
    const data = await program.account.bank.fetchMultiple(addresses);

    data.forEach((d, idx) => {
      if (d) {
        bankDatas.push({ address: addresses[idx], data: d });
      } else {
        console.error(`Bank ${addresses[idx].toBase58()} not found`);
      }
    });
  } else {
    const bankOpts = opts?.groupAddress
      ? [{ memcmp: { offset: 8 + 32 + 1, bytes: opts.groupAddress.toBase58() } }]
      : [];
    const data = await program.account.bank.all(bankOpts);
    bankDatas = data.map((d) => ({ address: d.publicKey, data: d.account }));
  }

  return bankDatas;
};

type PythFeedMapResponse = Record<
  string,
  {
    feedId: string;
    shardId?: number;
  }
>;

export const fetchPythOracleData = async (
  banks: { address: PublicKey; data: BankRaw }[],
  connection: Connection,
  bankMetadataMap: {
    [address: string]: BankMetadata;
  },
  opts?: { useApiEndpoint?: boolean }
): Promise<{
  pythFeedMap: PythPushFeedIdMap;
  bankOraclePriceMap: Map<string, OraclePrice>;
}> => {
  const pythLegacyBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "pythLegacy" in bank.data.config.oracleSetup
  );
  const pythPushBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "pythPushOracle" in bank.data.config.oracleSetup
  );
  const pythStakedCollateralBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "stakedWithPythPush" in bank.data.config.oracleSetup
  );

  let pythFeedMap: PythPushFeedIdMap;
  let priceCoeffByBank: Record<string, number>;

  const voteAccMintTuples: [string, string][] = pythStakedCollateralBanks.map((bank) => [
    bankMetadataMap[bank.address.toBase58()]?.validatorVoteAccount ?? "",
    bank.data.mint?.toBase58() ?? "",
  ]);

  if (opts?.useApiEndpoint) {
    const pythFeedMapPromise = fetch(
      "/api/bankData/pythFeedMap?feedIds=" +
        pythPushBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()).join(",")
    );
    const encodedQuery = encodeURIComponent(JSON.stringify(voteAccMintTuples));
    const stakedCollatDataPromise = fetch(`/api/bankData/stakedCollatData?voteAccMintTuple=${encodedQuery}`);

    const [pythFeedMapResponse, stakedCollatDataResponse] = await Promise.all([
      pythFeedMapPromise,
      stakedCollatDataPromise,
    ]);

    if (!pythFeedMapResponse.ok) {
      throw new Error("Failed to fetch pyth feed map");
    }

    if (!stakedCollatDataResponse.ok) {
      throw new Error("Failed to fetch staked collateral data");
    }

    const pythFeedMapJson: PythFeedMapResponse = await pythFeedMapResponse.json();
    const stakedCollatDataJson: Record<string, number> = await stakedCollatDataResponse.json();

    pythFeedMap = new Map<string, { feedId: PublicKey; shardId?: number }>();
    Object.entries(pythFeedMapJson).forEach(([feedId, { feedId: feedIdStr, shardId }]) => {
      pythFeedMap.set(feedId, { feedId: new PublicKey(feedIdStr), shardId });
    });

    // Convert priceCoeffByVoteAcc to priceCoeffByBank
    priceCoeffByBank = {};
    pythStakedCollateralBanks.forEach((bank) => {
      const voteAccount = bankMetadataMap[bank.address.toBase58()]?.validatorVoteAccount;
      if (voteAccount && stakedCollatDataJson[voteAccount] !== undefined) {
        priceCoeffByBank[bank.address.toBase58()] = stakedCollatDataJson[voteAccount];
      }
    });
  } else {
    pythFeedMap = await buildFeedIdMap(
      banks.map((bank) => bank.data.config),
      connection
    );
    priceCoeffByBank = {};
  }

  const pythOracleKeys = [
    ...pythLegacyBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()),
    ...pythPushBanks.map((bank) => {
      const feed = pythFeedMap.get(bank.data.config.oracleKeys[0].toBuffer().toString("hex"));
      if (!feed) {
        throw new Error("Feed not found");
      }
      return feed.feedId.toBase58();
    }),
  ];

  let oraclePrices: Record<string, OraclePrice>;

  if (opts?.useApiEndpoint) {
    const pythOracleDataPromise = await fetch(
      "/api/bankData/pythOracleData?pythOracleKeys=" + pythOracleKeys.join(",")
    );

    if (!pythOracleDataPromise.ok) {
      throw new Error("Failed to fetch pyth oracle data");
    }

    const responseBody: Record<string, any> = await pythOracleDataPromise.json();
    oraclePrices = Object.fromEntries(
      Object.entries(responseBody).map(([key, oraclePrice]) => [
        key,
        {
          priceRealtime: {
            price: BigNumber(oraclePrice.priceRealtime.price),
            confidence: BigNumber(oraclePrice.priceRealtime.confidence),
            lowestPrice: BigNumber(oraclePrice.priceRealtime.lowestPrice),
            highestPrice: BigNumber(oraclePrice.priceRealtime.highestPrice),
          },
          priceWeighted: {
            price: BigNumber(oraclePrice.priceWeighted.price),
            confidence: BigNumber(oraclePrice.priceWeighted.confidence),
            lowestPrice: BigNumber(oraclePrice.priceWeighted.lowestPrice),
            highestPrice: BigNumber(oraclePrice.priceWeighted.highestPrice),
          },
          timestamp: oraclePrice.timestamp ? BigNumber(oraclePrice.timestamp) : null,
          pythShardId: oraclePrice.pythShardId,
        },
      ])
    ) as Record<string, OraclePrice>;
  } else {
    // handle non-API endpoint case
    // for now, returning empty object as placeholder
    oraclePrices = {};
  }

  if (opts?.useApiEndpoint) {
  } else {
  }

  // Create bank address to oracle price map
  const bankOraclePriceMap = new Map<string, OraclePrice>();

  // Map legacy banks
  pythLegacyBanks.forEach((bank) => {
    const oracleKey = bank.data.config.oracleKeys[0].toBase58();
    const oraclePrice = oraclePrices[oracleKey];
    if (oraclePrice) {
      bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
    }
  });

  // Map push oracle banks
  pythPushBanks.forEach((bank) => {
    const feed = pythFeedMap.get(bank.data.config.oracleKeys[0].toBuffer().toString("hex"));
    if (feed) {
      const oraclePrice = oraclePrices[feed.feedId.toBase58()];
      if (oraclePrice) {
        bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
      }
    }
  });

  // Map staked collateral banks
  pythStakedCollateralBanks.forEach((bank) => {
    const priceCoeff = priceCoeffByBank[bank.address.toBase58()];
    const feed = pythFeedMap.get(bank.data.config.oracleKeys[0].toBuffer().toString("hex"));

    if (feed && priceCoeff !== undefined) {
      const oraclePrice = oraclePrices[feed?.feedId.toBase58()];
      bankOraclePriceMap.set(bank.address.toBase58(), {
        timestamp: oraclePrice.timestamp,
        priceRealtime: adjustPriceComponent(oraclePrice.priceRealtime, priceCoeff),
        priceWeighted: adjustPriceComponent(oraclePrice.priceWeighted, priceCoeff),
      });
    }
  });

  return {
    pythFeedMap,
    bankOraclePriceMap,
  };
};

const adjustPriceComponent = (priceComponent: PriceWithConfidence, priceCoeff: number) => ({
  price: priceComponent.price.multipliedBy(priceCoeff),
  confidence: priceComponent.confidence,
  lowestPrice: priceComponent.lowestPrice.multipliedBy(priceCoeff),
  highestPrice: priceComponent.highestPrice.multipliedBy(priceCoeff),
});

import { PublicKey, Commitment } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  Bank,
  BankRaw,
  MarginfiGroup,
  MarginfiProgram,
  MintData,
  OraclePrice,
  PythPushFeedIdMap,
} from "@mrgnlabs/marginfi-client-v2";
import { BankMetadataMap, chunkedGetRawMultipleAccountInfoOrdered } from "@mrgnlabs/mrgn-common";

async function fetchGroupData(
  program: MarginfiProgram,
  groupAddress: PublicKey,
  commitment?: Commitment,
  bankAddresses?: PublicKey[],
  bankMetadataMap?: BankMetadataMap
): Promise<{
  marginfiGroup: MarginfiGroup;
  banks: Map<string, Bank>;
  priceInfos: Map<string, OraclePrice>;
  tokenDatas: Map<string, MintData>;
  feedIdMap: PythPushFeedIdMap;
}> {
  const debug = require("debug")("mfi:client");
  // Fetch & shape all accounts of Bank type (~ bank discovery)
  let bankDatasKeyed: { address: PublicKey; data: BankRaw }[] = [];
  if (bankAddresses && bankAddresses.length > 0) {
    debug("Using preloaded bank addresses, skipping gpa call", bankAddresses.length, "banks");
    let bankAccountsData = await program.account.bank.fetchMultiple(bankAddresses);
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] !== null) {
        bankDatasKeyed.push({
          address: bankAddresses[i],
          data: bankAccountsData[i] as any as BankRaw,
        });
      }
    }
  } else {
    let bankAccountsData = await program.account.bank.all([
      { memcmp: { offset: 8 + 32 + 1, bytes: groupAddress.toBase58() } },
    ]);
    bankDatasKeyed = bankAccountsData.map((account: any) => ({
      address: account.publicKey,
      data: account.account as any as BankRaw,
    }));
  }

  async function fetchPythFeedMap() {
    const feedIdMapRaw: Record<string, string> = await fetch(
      `/api/oracle/pythFeedMap?groupPk=${groupAddress.toBase58()}`
    ).then((response) => response.json());
    const feedIdMap: Map<string, PublicKey> = new Map(
      Object.entries(feedIdMapRaw).map(([key, value]) => [key, new PublicKey(value)])
    );
    return feedIdMap;
  }

  async function fetchOraclePrices() {
    const bankDataKeysStr = bankDatasKeyed.map((b) => b.address.toBase58());
    const response = await fetch(`/api/oracle/price?banks=${bankDataKeysStr.join(",")}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch oracle prices");
    }

    const responseBody = await response.json();

    if (!responseBody) {
      throw new Error("Failed to fetch oracle prices");
    }

    const oraclePrices = responseBody.map((oraclePrice: any) => ({
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
    })) as OraclePrice[];

    return oraclePrices;
  }

  const [feedIdMap, oraclePrices] = await Promise.all([fetchPythFeedMap(), fetchOraclePrices()]);

  const mintKeys = bankDatasKeyed.map((b) => b.data.mint);
  const emissionMintKeys = bankDatasKeyed
    .map((b) => b.data.emissionsMint)
    .filter((pk) => !pk.equals(PublicKey.default)) as PublicKey[];

  // Batch-fetch the group account and all the oracle accounts as per the banks retrieved above
  const allAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
    groupAddress.toBase58(),
    ...mintKeys.map((pk) => pk.toBase58()),
    ...emissionMintKeys.map((pk) => pk.toBase58()),
  ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank

  const groupAi = allAis.shift();
  const mintAis = allAis.splice(0, mintKeys.length);
  const emissionMintAis = allAis.splice(0);

  // Unpack raw data for group and oracles, and build the `Bank`s map
  if (!groupAi) throw new Error("Failed to fetch the on-chain group data");
  const marginfiGroup = MarginfiGroup.fromBuffer(groupAddress, groupAi.data, program.idl);

  const banks = new Map(
    bankDatasKeyed.map(({ address, data }) => {
      const bankMetadata = bankMetadataMap ? bankMetadataMap[address.toBase58()] : undefined;
      const bank = Bank.fromAccountParsed(address, data, feedIdMap, bankMetadata);

      return [address.toBase58(), bank];
    })
  );

  const tokenDatas = new Map(
    bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
      const mintAddress = mintKeys[index];
      const mintDataRaw = mintAis[index];
      if (!mintDataRaw) throw new Error(`Failed to fetch mint account for bank ${bankAddress.toBase58()}`);
      let emissionTokenProgram: PublicKey | null = null;
      if (!bankData.emissionsMint.equals(PublicKey.default)) {
        const emissionMintDataRawIndex = emissionMintKeys.findIndex((pk) => pk.equals(bankData.emissionsMint));
        emissionTokenProgram = emissionMintDataRawIndex >= 0 ? emissionMintAis[emissionMintDataRawIndex].owner : null;
      }
      // TODO: parse extension data to see if there is a fee
      return [
        bankAddress.toBase58(),
        { mint: mintAddress, tokenProgram: mintDataRaw.owner, feeBps: 0, emissionTokenProgram },
      ];
    })
  );

  const priceInfos = new Map(
    bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
      const priceData = oraclePrices[index];
      if (!priceData) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
      return [bankAddress.toBase58(), priceData as OraclePrice];
    })
  );

  debug("Fetched %s banks and %s price feeds", banks.size, priceInfos.size);

  return {
    marginfiGroup,
    banks,
    priceInfos,
    tokenDatas,
    feedIdMap,
  };
}

export { fetchGroupData };
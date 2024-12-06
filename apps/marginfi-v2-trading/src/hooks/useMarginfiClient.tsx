import {
  feedIdToString,
  getConfig,
  MARGINFI_IDL,
  MarginfiClient,
  MarginfiConfig,
  MarginfiIdlType,
  MarginfiProgram,
  OracleSetup,
  PythPushFeedIdMap,
} from "@mrgnlabs/marginfi-client-v2";
import { MarginfiClientOptions } from "@mrgnlabs/marginfi-client-v2";
import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import React from "react";
import { useConnection } from "~/hooks/use-connection";
import { useTradeStoreV2 } from "~/store";
import { ArenaBank } from "~/store/tradeStoreV2";

type UseMarginfiClientProps = {
  groupPk: PublicKey;
  clientOptions?: MarginfiClientOptions;
  clientConfig?: Pick<MarginfiConfig, "environment" | "cluster" | "programId">;
};

const defaultConfig = getConfig();

export function useMarginfiClient({
  groupPk,
  clientOptions,
  clientConfig = {
    environment: defaultConfig.environment,
    cluster: defaultConfig.cluster,
    programId: defaultConfig.programId,
  },
}: UseMarginfiClientProps) {
  const [
    arenaPools,
    banksByBankPk,
    groupsByGroupPk,
    tokenAccountMap,
    lutByGroupPk,
    mintDataByMint,
    bankMetadataCache,
    wallet,
  ] = useTradeStoreV2((state) => [
    state.arenaPools,
    state.banksByBankPk,
    state.groupsByGroupPk,
    state.tokenAccountMap,
    state.lutByGroupPk,
    state.mintDataByMint,
    state.bankMetadataCache,
    state.wallet,
  ]);
  const { connection } = useConnection();

  const client = React.useMemo(() => {
    // console.log("client fetch triggered for group", groupPk.toBase58());
    const lut = lutByGroupPk[groupPk.toBase58()] ?? [];
    const group = groupsByGroupPk[groupPk.toBase58()];
    const pool = arenaPools[groupPk.toBase58()];

    if (!lut || !group || !pool) {
      return null;
    }
    const tokenBank = banksByBankPk[pool.tokenBankPk.toBase58()];
    const quoteBank = banksByBankPk[pool.quoteBankPk.toBase58()];
    const tokenMint = mintDataByMint.get(pool.tokenBankPk.toBase58());
    const quoteMint = mintDataByMint.get(pool.quoteBankPk.toBase58());

    if (!tokenMint || !quoteMint) {
      return null;
    }

    const mintData = new Map(
      [
        { mintData: tokenMint, bankPk: pool.tokenBankPk.toBase58() },
        { mintData: quoteMint, bankPk: pool.quoteBankPk.toBase58() },
      ].map((data) => [data.bankPk, data.mintData])
    );
    const banks = new Map(
      [tokenBank, quoteBank].map((bank) => [bank.info.rawBank.address.toBase58(), bank.info.rawBank])
    );
    const bankAddresses = [tokenBank.info.rawBank.address, quoteBank.info.rawBank.address];
    const priceInfos = new Map(
      [tokenBank, quoteBank].map((bank) => [bank.info.rawBank.address.toBase58(), bank.info.oraclePrice])
    );
    const feedIdMap = getPythFeedIdMap([tokenBank, quoteBank]);

    const confirmOpts = clientOptions?.confirmOpts ?? {};
    const provider = new AnchorProvider(connection, wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
      ...confirmOpts,
    });

    const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: clientConfig.programId.toBase58() };

    const program = new Program(idl, provider) as any as MarginfiProgram;

    const client = new MarginfiClient(
      { groupPk, ...clientConfig },
      program,
      wallet,
      clientOptions?.readOnly ?? false,
      group,
      banks,
      priceInfos,
      mintData,
      feedIdMap,
      lut,
      bankAddresses,
      bankMetadataCache,
      clientOptions?.bundleSimRpcEndpoint,
      clientOptions?.processTransactionStrategy
    );

    return client;
    //excluded connection from the deps to prevent unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lutByGroupPk,
    groupPk,
    groupsByGroupPk,
    arenaPools,
    banksByBankPk,
    mintDataByMint,
    clientOptions?.confirmOpts,
    clientOptions?.readOnly,
    clientOptions?.bundleSimRpcEndpoint,
    clientOptions?.processTransactionStrategy,
    wallet,
    clientConfig,
    bankMetadataCache,
  ]);

  return client;
}

function getPythFeedIdMap(banks: ArenaBank[]) {
  const pythBanks = banks.filter((bank) => bank.info.rawBank.config.oracleSetup === OracleSetup.PythPushOracle);

  const feedIdMap: PythPushFeedIdMap = new Map();
  pythBanks.forEach((bank) => {
    const config = bank.info.rawBank.config;
    const oracleKey = bank.info.rawBank.oracleKey;

    const feedId = feedIdToString(config.oracleKeys[0]);
    feedIdMap.set(feedId, oracleKey);
  });

  return feedIdMap;
}

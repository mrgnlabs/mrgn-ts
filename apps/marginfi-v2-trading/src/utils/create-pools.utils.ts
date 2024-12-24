import * as sb from "@switchboard-xyz/on-demand";
import * as anchor from "@coral-xyz/anchor";
import { CrossbarClient, decodeString } from "@switchboard-xyz/common";

import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { BankConfigOpt, getConfig, MarginfiClient, OracleSetup, RiskTier } from "@mrgnlabs/marginfi-client-v2";
import { uiToNative, Wallet } from "@mrgnlabs/mrgn-common";

import { DEFAULT_STABLE_BANK_CONFIG, DEFAULT_TOKEN_BANK_CONFIG, STABLE_MINT_KEYS } from "~/consts/bank-config.consts";
import { DEFAULT_BORROW_LIMIT } from "~/consts/bank-config.consts";
import { DEFAULT_DEPOSIT_LIMIT } from "~/consts/bank-config.consts";
import {
  createDivideOracleTask,
  DEFAULT_PULL_FEED_CONF,
  MULTIPLY_ORACLE_TASK,
  VALUE_TASK,
} from "~/consts/oracle-config.consts";
import { BirdeyeMarketDataResponse, PoolOracleApiResponse } from "~/types/api.types";

export const getBankConfig = async (
  marginfiClient: MarginfiClient,
  mint: PublicKey,
  decimals: number,
  useExistingOracle: boolean
) => {
  let bankConfig: BankConfigOpt;

  // search if bank exists in mrgnlend and if it is a main pool bank
  const bank = Array.from(marginfiClient.banks.entries()).find(
    ([_, bank]) => bank.mint.toBase58() === mint.toBase58() && bank.config.riskTier === RiskTier.Collateral
  )?.[1];

  if (STABLE_MINT_KEYS.includes(mint.toBase58())) {
    bankConfig = DEFAULT_STABLE_BANK_CONFIG;
  } else {
    bankConfig = DEFAULT_TOKEN_BANK_CONFIG;
  }

  bankConfig = await addLimitsToBankConfig(mint, bankConfig, decimals);

  if (bank && useExistingOracle) {
    const feedKeys = bank.config.oracleKeys.filter(
      (key) => !key.equals(new PublicKey("11111111111111111111111111111111"))
    );

    bankConfig.oracle = {
      setup: bank.config.oracleSetup,
      keys: [...feedKeys, bank.oracleKey],
    };
    bankConfig.oracleMaxAge = bank.config.oracleMaxAge;
  }

  return bankConfig;
};

export const addLimitsToBankConfig = async (mint: PublicKey, bankConfig: BankConfigOpt, decimals: number) => {
  let depositLimit = new BigNumber(DEFAULT_DEPOSIT_LIMIT);
  let borrowLimit = new BigNumber(DEFAULT_BORROW_LIMIT);

  try {
    const response = await fetch(`/api/token/market-data?address=${mint.toBase58()}`);
    const marketData: BirdeyeMarketDataResponse = await response.json();
    depositLimit = new BigNumber(uiToNative(marketData.circulating_supply, decimals).toString());
    borrowLimit = new BigNumber(uiToNative(marketData.circulating_supply, decimals).toString());
  } catch (error) {
    console.error(`[ERROR] Failed to fetch market data for ${mint.toBase58()}: ${error}`);
  }

  return {
    ...bankConfig,
    borrowLimit,
    depositLimit,
  };
};

export const createOracleIx = async (mint: PublicKey, symbol: string, connection: Connection, wallet: Wallet) => {
  // Initialize the on-demand program and generate a pull feed

  // Get the default queue
  const response = await fetch("/api/pool/oracle");
  const data: PoolOracleApiResponse = await response.json();
  const { programIdl: programIdlString, programId, queueKey } = data;
  const programIdl = JSON.parse(programIdlString);
  const program = new anchor.Program(
    programIdl,
    new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions())
  );

  // Get the default crossbar server client
  const crossbarClient = CrossbarClient.default();

  // Initialize tasks for the oracle job
  const valueTask = sb.OracleJob.Task.create(VALUE_TASK);
  const divideTask = sb.OracleJob.Task.create(createDivideOracleTask(mint.toBase58()));
  const multiplyTask = sb.OracleJob.Task.create(MULTIPLY_ORACLE_TASK);
  const oracleJob = sb.OracleJob.create({
    tasks: [valueTask, divideTask, multiplyTask],
  });

  // Store the oracle job and get the feed hash
  const feedHash = (await crossbarClient.store(queueKey, [oracleJob])).feedHash;
  const feedHashBuffer = decodeString(feedHash);
  if (!feedHashBuffer) return;

  const [pullFeed, feedSeed] = sb.PullFeed.generate(program);

  const conf = {
    ...DEFAULT_PULL_FEED_CONF,
    name: `${symbol}/USD`, // the feed name (max 32 bytes)
    queue: new PublicKey(queueKey), // the queue of oracles to bind to
    feedHash: Buffer.from(feedHash.slice(2), "hex"),
    payer: wallet.publicKey,
  };

  // Initialize the pull feed
  const pullFeedIx = await pullFeed.initIx(conf);

  console.log(`[INFO] Feed Public Key for ${symbol}/USD: ${feedSeed.publicKey.toBase58()}`);
  return { feedPubkey: feedSeed.publicKey, pullFeedIx, feedSeed };
};

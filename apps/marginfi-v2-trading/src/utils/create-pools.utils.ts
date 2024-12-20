import * as sb from "@switchboard-xyz/on-demand";
import * as anchor from "@coral-xyz/anchor";
import { CrossbarClient, decodeString } from "@switchboard-xyz/common";

import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { BankConfigOpt } from "@mrgnlabs/marginfi-client-v2";
import { Wallet } from "@mrgnlabs/mrgn-common";

import {
  DEFAULT_STABLECOIN_BANK_CONFIG,
  DEFAULT_LST_BANK_CONFIG,
  DEFAULT_TOKEN_BANK_CONFIG,
  LST_MINT_KEYS,
  STABLE_MINT_KEYS,
} from "~/consts/bank-config.consts";
import { DEFAULT_BORROW_LIMIT } from "~/consts/bank-config.consts";
import { DEFAULT_DEPOSIT_LIMIT } from "~/consts/bank-config.consts";
import {
  createDivideOracleTask,
  DEFAULT_PULL_FEED_CONF,
  MULTIPLY_ORACLE_TASK,
  VALUE_TASK,
} from "~/consts/oracle-config.consts";
import { PoolOracleApiResponse } from "~/types/api.types";

export const getBankConfig = (mint: PublicKey, price: number, decimals: number) => {
  let bankConfig: BankConfigOpt;

  switch (true) {
    case STABLE_MINT_KEYS.includes(mint.toBase58()):
      bankConfig = DEFAULT_STABLECOIN_BANK_CONFIG;
      break;
    case LST_MINT_KEYS.includes(mint.toBase58()):
      bankConfig = DEFAULT_LST_BANK_CONFIG;
      break;
    default:
      bankConfig = DEFAULT_TOKEN_BANK_CONFIG;
      break;
  }

  bankConfig = addLimitsToBankConfig(bankConfig, price, decimals);

  return bankConfig;
};

export const addLimitsToBankConfig = (bankConfig: BankConfigOpt, price: number, decimals: number) => {
  const depositLimit = new BigNumber(Math.floor(DEFAULT_DEPOSIT_LIMIT / price)).multipliedBy(Math.pow(10, decimals));
  const borrowLimit = new BigNumber(Math.floor(DEFAULT_BORROW_LIMIT / price)).multipliedBy(Math.pow(10, decimals));

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

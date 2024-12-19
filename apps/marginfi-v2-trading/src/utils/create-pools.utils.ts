import * as sb from "@switchboard-xyz/on-demand";
import { CrossbarClient, decodeString } from "@switchboard-xyz/common";
import * as anchor from "@coral-xyz/anchor";
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
  const newConnection = new Connection("___ENDPOINT___", "confirmed");

  // Get the default queue
  let queue = await sb.getDefaultQueue(newConnection.rpcEndpoint);

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
  const feedHash = (await crossbarClient.store(queue.pubkey.toBase58(), [oracleJob])).feedHash;
  const feedHashBuffer = decodeString(feedHash);
  if (!feedHashBuffer) return;

  const [pullFeed, feedSeed] = sb.PullFeed.generate(queue.program);

  const conf = {
    ...DEFAULT_PULL_FEED_CONF,
    name: `${symbol}/USD`, // the feed name (max 32 bytes)
    queue: queue.pubkey, // the queue of oracles to bind to
    feedHash: Buffer.from(feedHash.slice(2), "hex"),
    payer: wallet.publicKey,
  };

  // Initialize the pull feed
  const pullFeedIx = await pullFeed.initIx(conf);

  console.log(`[INFO] Feed Public Key for ${symbol}/USD: ${feedSeed.publicKey.toBase58()}`);
  return { feedPubkey: feedSeed.publicKey, pullFeedIx, feedSeed };
};

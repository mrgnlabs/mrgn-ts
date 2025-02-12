import * as sb from "@switchboard-xyz/common";

/**
 * ┌────────────────────────────--─────────────────┐
 * │ Oracle Configurations for Permission Pools    │
 * └───────────────────────────────--──────────────┘
 */

/**
 * Default Pull Feed Configuration
 */
export const DEFAULT_PULL_FEED_CONF = {
  //   name: `TOKEN/USD`, // the feed name (max 32 bytes)
  //   queue: new PublicKey(queue), // the queue of oracles to bind to
  maxVariance: 10.0, // allow 1% variance between submissions and jobs
  minResponses: 1, // minimum number of responses of jobs to allow
  //numSignatures: 1, // number of signatures to fetch per update, not in the config it looks like
  minSampleSize: 1, // minimum number of responses to sample for a result
  maxStaleness: 250, // maximum stale slots of responses to sample
  //   feedHash: feedHashBuffer,
};

/**
 * Value Task Configuration
 */
export const VALUE_TASK: sb.OracleJob.ITask = {
  valueTask: {
    big: "1",
  },
};

/**
 * Divide Task Configuration
 */
export function createDivideOracleTask(outTokenAddress: string): sb.OracleJob.ITask {
  return {
    divideTask: {
      job: {
        tasks: [
          {
            jupiterSwapTask: {
              inTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
              outTokenAddress, // TOKEN
              baseAmountString: "1",
            },
          },
        ],
      },
    },
  };
}

/**
 * Multiply Task Configuration
 */
export const MULTIPLY_ORACLE_TASK: sb.OracleJob.ITask = {
  multiplyTask: {
    job: {
      tasks: [
        {
          oracleTask: {
            pythAddress: "Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD", // PYTH USDC oracle
            pythAllowedConfidenceInterval: 5,
          },
        },
      ],
    },
  },
};

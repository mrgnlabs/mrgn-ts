import { PublicKey } from "@solana/web3.js";

export const DEFAULT_RECEIVER_PROGRAM_ID = new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
export const DEFAULT_WORMHOLE_PROGRAM_ID = new PublicKey("HDwcJBJXjL9FpJ7UBsYBtaDjsBUhuLCUYoz3zr8SWWaQ");
export const DEFAULT_PUSH_ORACLE_PROGRAM_ID = new PublicKey("pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT");

export const ACCUMULATOR_MAGIC = "504e4155";
export const MAJOR_VERSION = 1;
export const MINOR_VERSION = 0;
export const KECCAK160_HASH_SIZE = 20;
export const PRICE_FEED_MESSAGE_VARIANT = 0;
export const TWAP_MESSAGE_VARIANT = 1;

/**
 * A hard-coded budget for the compute units required for the `verifyEncodedVaa` instruction in the Wormhole program.
 */
export const VERIFY_ENCODED_VAA_COMPUTE_BUDGET = 350000;
/**
 * A hard-coded budget for the compute units required for the `postUpdateAtomic` instruction in the Pyth Solana Receiver program.
 */
export const POST_UPDATE_ATOMIC_COMPUTE_BUDGET = 170000;
/**
 * A hard-coded budget for the compute units required for the `postUpdate` instruction in the Pyth Solana Receiver program.
 */
export const POST_UPDATE_COMPUTE_BUDGET = 35000;
/**
 * A hard-coded budget for the compute units required for the `postTwapUpdate` instruction in the Pyth Solana Receiver program.
 */
export const POST_TWAP_UPDATE_COMPUTE_BUDGET = 50_000;
/**
 * A hard-coded budget for the compute units required for the `updatePriceFeed` instruction in the Pyth Push Oracle program.
 */
export const UPDATE_PRICE_FEED_COMPUTE_BUDGET = 55000;
/**
 * A hard-coded budget for the compute units required for the `initEncodedVaa` instruction in the Wormhole program.
 */
export const INIT_ENCODED_VAA_COMPUTE_BUDGET = 3000;
/**
 * A hard-coded budget for the compute units required for the `writeEncodedVaa` instruction in the Wormhole program.
 */
export const WRITE_ENCODED_VAA_COMPUTE_BUDGET = 3000;
/**
 * A hard-coded budget for the compute units required for the `closeEncodedVaa` instruction in the Wormhole program.
 */
export const CLOSE_ENCODED_VAA_COMPUTE_BUDGET = 30000;

export const VAA_SPLIT_INDEX = 721;

export const VAA_START = 46;

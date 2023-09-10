import * as borsh from "@coral-xyz/borsh";
import { SwitchboardDecimal } from "./switchboardDecimal";
import { AggregatorRound } from "./aggregatorRound";
import { Hash } from "./Hash";
import * as AggregatorResolutionMode from "./AggregatorResolutionMode";

export class AggregatorAccountData {
  /** Name of the aggregator to store on-chain. */
  name;
  /** Metadata of the aggregator to store on-chain. */
  metadata;
  /** Reserved. */
  reserved1;
  /** Pubkey of the queue the aggregator belongs to. */
  queuePubkey;
  /**
   * CONFIGS
   * Number of oracles assigned to an update request.
   */
  oracleRequestBatchSize;
  /** Minimum number of oracle responses required before a round is validated. */
  minOracleResults;
  /** Minimum number of job results before an oracle accepts a result. */
  minJobResults;
  /** Minimum number of seconds required between aggregator rounds. */
  minUpdateDelaySeconds;
  /** Unix timestamp for which no feed update will occur before. */
  startAfter;
  /** Change percentage required between a previous round and the current round. If variance percentage is not met, reject new oracle responses. */
  varianceThreshold;
  /** Number of seconds for which, even if the variance threshold is not passed, accept new responses from oracles. */
  forceReportPeriod;
  /** Timestamp when the feed is no longer needed. */
  expiration;
  /** Counter for the number of consecutive failures before a feed is removed from a queue. If set to 0, failed feeds will remain on the queue. */
  consecutiveFailureCount;
  /** Timestamp when the next update request will be available. */
  nextAllowedUpdateTime;
  /** Flag for whether an aggregators configuration is locked for editing. */
  isLocked;
  /** Optional, public key of the crank the aggregator is currently using. Event based feeds do not need a crank. */
  crankPubkey;
  /** Latest confirmed update request result that has been accepted as valid. */
  latestConfirmedRound;
  /** Oracle results from the current round of update request that has not been accepted as valid yet. */
  currentRound;
  /** List of public keys containing the job definitions for how data is sourced off-chain by oracles. */
  jobPubkeysData;
  /** Used to protect against malicious RPC nodes providing incorrect task definitions to oracles before fulfillment. */
  jobHashes;
  /** Number of jobs assigned to an oracle. */
  jobPubkeysSize;
  /** Used to protect against malicious RPC nodes providing incorrect task definitions to oracles before fulfillment. */
  jobsChecksum;
  /** The account delegated as the authority for making account changes. */
  authority;
  /** Optional, public key of a history buffer account storing the last N accepted results and their timestamps. */
  historyBuffer;
  /** The previous confirmed round result. */
  previousConfirmedRoundResult;
  /** The slot when the previous confirmed round was opened. */
  previousConfirmedRoundSlot;
  /** Whether an aggregator is permitted to join a crank. */
  disableCrank;
  /** Job weights used for the weighted median of the aggregator's assigned job accounts. */
  jobWeights;
  /** Unix timestamp when the feed was created. */
  creationTimestamp;
  /**
   * Use sliding window or round based resolution
   * NOTE: This changes result propogation in latest_round_result
   */
  resolutionMode;
  basePriorityFee;
  priorityFeeBump;
  priorityFeeBumpPeriod;
  maxPriorityFeeMultiplier;
  /** Reserved for future info. */
  ebuf;
  static discriminator = Buffer.from([217, 230, 65, 101, 201, 162, 27, 125]);
  static layout = borsh.struct([
    borsh.array(borsh.u8(), 32, "name"),
    borsh.array(borsh.u8(), 128, "metadata"),
    borsh.array(borsh.u8(), 32, "reserved1"),
    borsh.publicKey("queuePubkey"),
    borsh.u32("oracleRequestBatchSize"),
    borsh.u32("minOracleResults"),
    borsh.u32("minJobResults"),
    borsh.u32("minUpdateDelaySeconds"),
    borsh.i64("startAfter"),
    SwitchboardDecimal.layout("varianceThreshold"),
    borsh.i64("forceReportPeriod"),
    borsh.i64("expiration"),
    borsh.u64("consecutiveFailureCount"),
    borsh.i64("nextAllowedUpdateTime"),
    borsh.bool("isLocked"),
    borsh.publicKey("crankPubkey"),
    AggregatorRound.layout("latestConfirmedRound"),
    AggregatorRound.layout("currentRound"),
    borsh.array(borsh.publicKey(), 16, "jobPubkeysData"),
    borsh.array(Hash.layout({}), 16, "jobHashes"),
    borsh.u32("jobPubkeysSize"),
    borsh.array(borsh.u8(), 32, "jobsChecksum"),
    borsh.publicKey("authority"),
    borsh.publicKey("historyBuffer"),
    SwitchboardDecimal.layout("previousConfirmedRoundResult"),
    borsh.u64("previousConfirmedRoundSlot"),
    borsh.bool("disableCrank"),
    borsh.array(borsh.u8(), 16, "jobWeights"),
    borsh.i64("creationTimestamp"),
    AggregatorResolutionMode.layout("resolutionMode"),
    borsh.u32("basePriorityFee"),
    borsh.u32("priorityFeeBump"),
    borsh.u32("priorityFeeBumpPeriod"),
    borsh.u32("maxPriorityFeeMultiplier"),
    borsh.array(borsh.u8(), 122, "ebuf"),
  ]);
  constructor(fields: any) {
    this.name = fields.name;
    this.metadata = fields.metadata;
    this.reserved1 = fields.reserved1;
    this.queuePubkey = fields.queuePubkey;
    this.oracleRequestBatchSize = fields.oracleRequestBatchSize;
    this.minOracleResults = fields.minOracleResults;
    this.minJobResults = fields.minJobResults;
    this.minUpdateDelaySeconds = fields.minUpdateDelaySeconds;
    this.startAfter = fields.startAfter;
    this.varianceThreshold = new SwitchboardDecimal({
      ...fields.varianceThreshold,
    });
    this.forceReportPeriod = fields.forceReportPeriod;
    this.expiration = fields.expiration;
    this.consecutiveFailureCount = fields.consecutiveFailureCount;
    this.nextAllowedUpdateTime = fields.nextAllowedUpdateTime;
    this.isLocked = fields.isLocked;
    this.crankPubkey = fields.crankPubkey;
    this.latestConfirmedRound = new AggregatorRound({
      ...fields.latestConfirmedRound,
    });
    this.currentRound = new AggregatorRound({ ...fields.currentRound });
    this.jobPubkeysData = fields.jobPubkeysData;
    this.jobHashes = fields.jobHashes.map((item: any) => new Hash({ ...item }));
    this.jobPubkeysSize = fields.jobPubkeysSize;
    this.jobsChecksum = fields.jobsChecksum;
    this.authority = fields.authority;
    this.historyBuffer = fields.historyBuffer;
    this.previousConfirmedRoundResult = new SwitchboardDecimal({
      ...fields.previousConfirmedRoundResult,
    });
    this.previousConfirmedRoundSlot = fields.previousConfirmedRoundSlot;
    this.disableCrank = fields.disableCrank;
    this.jobWeights = fields.jobWeights;
    this.creationTimestamp = fields.creationTimestamp;
    this.resolutionMode = fields.resolutionMode;
    this.basePriorityFee = fields.basePriorityFee;
    this.priorityFeeBump = fields.priorityFeeBump;
    this.priorityFeeBumpPeriod = fields.priorityFeeBumpPeriod;
    this.maxPriorityFeeMultiplier = fields.maxPriorityFeeMultiplier;
    this.ebuf = fields.ebuf;
  }
  static decode(data: any) {
    if (!data.slice(0, 8).equals(AggregatorAccountData.discriminator)) {
      throw new Error("invalid account discriminator");
    }
    const dec = AggregatorAccountData.layout.decode(data.slice(8));
    return new AggregatorAccountData({
      name: dec.name,
      metadata: dec.metadata,
      reserved1: dec.reserved1,
      queuePubkey: dec.queuePubkey,
      oracleRequestBatchSize: dec.oracleRequestBatchSize,
      minOracleResults: dec.minOracleResults,
      minJobResults: dec.minJobResults,
      minUpdateDelaySeconds: dec.minUpdateDelaySeconds,
      startAfter: dec.startAfter,
      varianceThreshold: SwitchboardDecimal.fromDecoded(dec.varianceThreshold),
      forceReportPeriod: dec.forceReportPeriod,
      expiration: dec.expiration,
      consecutiveFailureCount: dec.consecutiveFailureCount,
      nextAllowedUpdateTime: dec.nextAllowedUpdateTime,
      isLocked: dec.isLocked,
      crankPubkey: dec.crankPubkey,
      latestConfirmedRound: AggregatorRound.fromDecoded(dec.latestConfirmedRound),
      currentRound: AggregatorRound.fromDecoded(dec.currentRound),
      jobPubkeysData: dec.jobPubkeysData,
      jobHashes: dec.jobHashes.map((item: any) => Hash.fromDecoded(item)),
      jobPubkeysSize: dec.jobPubkeysSize,
      jobsChecksum: dec.jobsChecksum,
      authority: dec.authority,
      historyBuffer: dec.historyBuffer,
      previousConfirmedRoundResult: SwitchboardDecimal.fromDecoded(dec.previousConfirmedRoundResult),
      previousConfirmedRoundSlot: dec.previousConfirmedRoundSlot,
      disableCrank: dec.disableCrank,
      jobWeights: dec.jobWeights,
      creationTimestamp: dec.creationTimestamp,
      resolutionMode: AggregatorResolutionMode.fromDecoded(dec.resolutionMode),
      basePriorityFee: dec.basePriorityFee,
      priorityFeeBump: dec.priorityFeeBump,
      priorityFeeBumpPeriod: dec.priorityFeeBumpPeriod,
      maxPriorityFeeMultiplier: dec.maxPriorityFeeMultiplier,
      ebuf: dec.ebuf,
    });
  }
}

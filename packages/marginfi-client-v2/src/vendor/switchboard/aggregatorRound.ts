// import * as types from "../types/index.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh";
import { PublicKey, PublicKeyInitData } from "@solana/web3.js";
// import { BN } from "@switchboard-xyz/common"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { SwitchboardDecimal } from "./switchboardDecimal";
import { BN } from "@coral-xyz/anchor";
export class AggregatorRound {
  /**
   * Maintains the number of successful responses received from nodes.
   * Nodes can submit one successful response per round.
   */
  numSuccess;
  /** Number of error responses. */
  numError;
  /** Whether an update request round has ended. */
  isClosed;
  /** Maintains the `solana_program::clock::Slot` that the round was opened at. */
  roundOpenSlot;
  /** Maintains the `solana_program::clock::UnixTimestamp;` the round was opened at. */
  roundOpenTimestamp;
  /** Maintains the current median of all successful round responses. */
  result;
  /** Standard deviation of the accepted results in the round. */
  stdDeviation;
  /** Maintains the minimum node response this round. */
  minResponse;
  /** Maintains the maximum node response this round. */
  maxResponse;
  /** Pubkeys of the oracles fulfilling this round. */
  oraclePubkeysData;
  /** Represents all successful node responses this round. `NaN` if empty. */
  mediansData;
  /** Current rewards/slashes oracles have received this round. */
  currentPayout;
  /** Keep track of which responses are fulfilled here. */
  mediansFulfilled;
  /** Keeps track of which errors are fulfilled here. */
  errorsFulfilled;
  constructor(fields: any) {
    this.numSuccess = fields.numSuccess;
    this.numError = fields.numError;
    this.isClosed = fields.isClosed;
    this.roundOpenSlot = fields.roundOpenSlot;
    this.roundOpenTimestamp = fields.roundOpenTimestamp;
    this.result = new SwitchboardDecimal({ ...fields.result });
    this.stdDeviation = new SwitchboardDecimal({
      ...fields.stdDeviation,
    });
    this.minResponse = new SwitchboardDecimal({ ...fields.minResponse });
    this.maxResponse = new SwitchboardDecimal({ ...fields.maxResponse });
    this.oraclePubkeysData = fields.oraclePubkeysData;
    this.mediansData = fields.mediansData.map((item: any) => new SwitchboardDecimal({ ...item }));
    this.currentPayout = fields.currentPayout;
    this.mediansFulfilled = fields.mediansFulfilled;
    this.errorsFulfilled = fields.errorsFulfilled;
  }
  static layout(property: any) {
    return borsh.struct(
      [
        borsh.u32("numSuccess"),
        borsh.u32("numError"),
        borsh.bool("isClosed"),
        borsh.u64("roundOpenSlot"),
        borsh.i64("roundOpenTimestamp"),
        SwitchboardDecimal.layout("result"),
        SwitchboardDecimal.layout("stdDeviation"),
        SwitchboardDecimal.layout("minResponse"),
        SwitchboardDecimal.layout("maxResponse"),
        borsh.array(borsh.publicKey(), 16, "oraclePubkeysData"),
        borsh.array(SwitchboardDecimal.layout({}), 16, "mediansData"),
        borsh.array(borsh.i64(), 16, "currentPayout"),
        borsh.array(borsh.bool(), 16, "mediansFulfilled"),
        borsh.array(borsh.bool(), 16, "errorsFulfilled"),
      ],
      property
    );
  }
  static fromDecoded(obj: any) {
    return new AggregatorRound({
      numSuccess: obj.numSuccess,
      numError: obj.numError,
      isClosed: obj.isClosed,
      roundOpenSlot: obj.roundOpenSlot,
      roundOpenTimestamp: obj.roundOpenTimestamp,
      result: SwitchboardDecimal.fromDecoded(obj.result),
      stdDeviation: SwitchboardDecimal.fromDecoded(obj.stdDeviation),
      minResponse: SwitchboardDecimal.fromDecoded(obj.minResponse),
      maxResponse: SwitchboardDecimal.fromDecoded(obj.maxResponse),
      oraclePubkeysData: obj.oraclePubkeysData,
      mediansData: obj.mediansData.map((item: any) => SwitchboardDecimal.fromDecoded(item)),
      currentPayout: obj.currentPayout,
      mediansFulfilled: obj.mediansFulfilled,
      errorsFulfilled: obj.errorsFulfilled,
    });
  }
  static toEncodable(fields: any) {
    return {
      numSuccess: fields.numSuccess,
      numError: fields.numError,
      isClosed: fields.isClosed,
      roundOpenSlot: fields.roundOpenSlot,
      roundOpenTimestamp: fields.roundOpenTimestamp,
      result: SwitchboardDecimal.toEncodable(fields.result),
      stdDeviation: SwitchboardDecimal.toEncodable(fields.stdDeviation),
      minResponse: SwitchboardDecimal.toEncodable(fields.minResponse),
      maxResponse: SwitchboardDecimal.toEncodable(fields.maxResponse),
      oraclePubkeysData: fields.oraclePubkeysData,
      mediansData: fields.mediansData.map((item: any) => SwitchboardDecimal.toEncodable(item)),
      currentPayout: fields.currentPayout,
      mediansFulfilled: fields.mediansFulfilled,
      errorsFulfilled: fields.errorsFulfilled,
    };
  }
  toJSON() {
    return {
      numSuccess: this.numSuccess,
      numError: this.numError,
      isClosed: this.isClosed,
      roundOpenSlot: this.roundOpenSlot.toString(),
      roundOpenTimestamp: this.roundOpenTimestamp.toString(),
      result: this.result.toJSON(),
      stdDeviation: this.stdDeviation.toJSON(),
      minResponse: this.minResponse.toJSON(),
      maxResponse: this.maxResponse.toJSON(),
      oraclePubkeysData: this.oraclePubkeysData.map((item: any) => item.toString()),
      mediansData: this.mediansData.map((item: any) => item.toJSON()),
      currentPayout: this.currentPayout.map((item: any) => item.toString()),
      mediansFulfilled: this.mediansFulfilled,
      errorsFulfilled: this.errorsFulfilled,
    };
  }
  static fromJSON(obj: any) {
    return new AggregatorRound({
      numSuccess: obj.numSuccess,
      numError: obj.numError,
      isClosed: obj.isClosed,
      roundOpenSlot: new BN(obj.roundOpenSlot),
      roundOpenTimestamp: new BN(obj.roundOpenTimestamp),
      result: SwitchboardDecimal.fromJSON(obj.result),
      stdDeviation: SwitchboardDecimal.fromJSON(obj.stdDeviation),
      minResponse: SwitchboardDecimal.fromJSON(obj.minResponse),
      maxResponse: SwitchboardDecimal.fromJSON(obj.maxResponse),
      oraclePubkeysData: obj.oraclePubkeysData.map((item: PublicKeyInitData) => new PublicKey(item)),
      mediansData: obj.mediansData.map(
        (item: { mantissa: string | number | BN | number[] | Uint8Array | Buffer; scale: any }) =>
          SwitchboardDecimal.fromJSON(item)
      ),
      currentPayout: obj.currentPayout.map(
        (item: string | number | BN | number[] | Uint8Array | Buffer) => new BN(item)
      ),
      mediansFulfilled: obj.mediansFulfilled,
      errorsFulfilled: obj.errorsFulfilled,
    });
  }
  toEncodable() {
    return AggregatorRound.toEncodable(this);
  }
}

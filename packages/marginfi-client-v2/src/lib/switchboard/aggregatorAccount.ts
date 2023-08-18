import { Account } from "./account";

export class AggregatorAccount extends Account {
  static decodeLatestValue(aggregator: { latestConfirmedRound: { numSuccess: any; result: { toBig: () => any } } }) {
    if ((aggregator.latestConfirmedRound?.numSuccess ?? 0) === 0) {
      return null;
    }
    const result = aggregator.latestConfirmedRound.result.toBig();
    return result;
  }
}

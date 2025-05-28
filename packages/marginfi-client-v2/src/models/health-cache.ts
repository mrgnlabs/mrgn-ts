import BigNumber from "bignumber.js";
import { getActiveHealthCacheFlags, HealthCacheFlags, HealthCacheRaw, HealthCacheType } from "../services";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";

export class HealthCache implements HealthCacheType {
  constructor(
    public assetValue: BigNumber,
    public liabilityValue: BigNumber,
    public assetValueMaint: BigNumber,
    public liabilityValueMaint: BigNumber,
    public assetValueEquity: BigNumber,
    public liabilityValueEquity: BigNumber,
    public timestamp: number,
    public flags: HealthCacheFlags[],
    public prices: number[][]
  ) {
    this.assetValue = assetValue;
    this.liabilityValue = liabilityValue;
    this.assetValueMaint = assetValueMaint;
    this.liabilityValueMaint = liabilityValueMaint;
    this.assetValueEquity = assetValueEquity;
    this.liabilityValueEquity = liabilityValueEquity;
    this.timestamp = timestamp;
    this.flags = flags;
    this.prices = prices;
  }

  static from(healthCacheRaw: HealthCacheRaw): HealthCache {
    const assetValue = wrappedI80F48toBigNumber(healthCacheRaw.assetValue);
    const liabilityValue = wrappedI80F48toBigNumber(healthCacheRaw.liabilityValue);
    const assetValueMaint = wrappedI80F48toBigNumber(healthCacheRaw.assetValueMaint);
    const liabilityValueMaint = wrappedI80F48toBigNumber(healthCacheRaw.liabilityValueMaint);
    const assetValueEquity = wrappedI80F48toBigNumber(healthCacheRaw.assetValueEquity);
    const liabilityValueEquity = wrappedI80F48toBigNumber(healthCacheRaw.liabilityValueEquity);
    const timestamp = 0;
    const flags = getActiveHealthCacheFlags(healthCacheRaw.flags);
    const prices = healthCacheRaw.prices;
    return new HealthCache(
      assetValue,
      liabilityValue,
      assetValueMaint,
      liabilityValueMaint,
      assetValueEquity,
      liabilityValueEquity,
      timestamp,
      flags,
      prices
    );
  }
}

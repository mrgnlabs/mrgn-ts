import { Campaign } from "./account";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import BN from "bn.js";
import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";

export enum CompoundFrequency {
  YEARLY = "YEARLY",
  MONTHLY = "MONTHLY",
  WEEKLY = "WEEKLY",
  DAILY = "DAILY",
  HOURLY = "HOURLY",
  EVERY_SECOND = "EVERY_SECOND",
}

export function compoundFrequencyToNbOfCompoundsPerYear(compoundFrequency: CompoundFrequency): number {
  switch (compoundFrequency) {
    case CompoundFrequency.YEARLY:
      return 1;
    case CompoundFrequency.MONTHLY:
      return 12;
    case CompoundFrequency.WEEKLY:
      return 52;
    case CompoundFrequency.DAILY:
      return 365;
    case CompoundFrequency.HOURLY:
      return 365 * 24;
    case CompoundFrequency.EVERY_SECOND:
      return 365 * 24 * 60 * 60;
  }
}

export function calculateInterestFromApr(
  principal: number,
  durationInYears: number,
  apr: number,
  compoundFrequency: CompoundFrequency
): number {
  const nbOfCompoundsPerYear = compoundFrequencyToNbOfCompoundsPerYear(compoundFrequency);
  return principal * (Math.pow(1 + apr / nbOfCompoundsPerYear, nbOfCompoundsPerYear * durationInYears) - 1);
}

export function calculateAprFromInterest(
  principal: number,
  durationInYears: number,
  interest: number,
  compoundFrequency: CompoundFrequency
): number {
  const nbOfCompoundsPerYear = compoundFrequencyToNbOfCompoundsPerYear(compoundFrequency);
  return nbOfCompoundsPerYear * (Math.pow(1 + interest / principal, 1 / (nbOfCompoundsPerYear * durationInYears)) - 1);
}

export function computeGuaranteedAprForCampaign(campaign: Campaign): number {
  return computeGuaranteedApr(campaign.lockupPeriod, campaign.maxDeposits, campaign.maxRewards, campaign.bank);
}

export function computeGuaranteedApr(lockupPeriodInSeconds: BN, maxDeposits: BN, maxRewards: BN, bank: Bank): number {
  const principal = nativeToUi(maxDeposits, bank.mintDecimals);
  const durationInYears = lockupPeriodInSeconds.toNumber() / 365 / 24 / 60 / 60;
  const interest = nativeToUi(maxRewards, bank.mintDecimals);
  return calculateAprFromInterest(principal, durationInYears, interest, CompoundFrequency.DAILY);
}

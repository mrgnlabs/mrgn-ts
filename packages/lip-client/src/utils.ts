import { Campaign } from "./account";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import BN from "bn.js";
import { Bank } from "@mrgnlabs/marginfi-client-v2";

export function calculateInterestFromApy(principal: number, durationInYears: number, Apy: number): number {
  return principal * Apy * durationInYears;
}

export function calculateApyFromInterest(principal: number, durationInYears: number, interest: number): number {
  return interest / (principal * durationInYears);
}

export function computeGuaranteedApyForCampaign(campaign: Campaign): number {
  return computeGuaranteedApy(campaign.lockupPeriod, campaign.maxDeposits, campaign.maxRewards, campaign.bank);
}

export function computeGuaranteedApy(lockupPeriodInSeconds: BN, maxDeposits: BN, maxRewards: BN, bank: Bank): number {
  const principal = nativeToUi(maxDeposits, bank.mintDecimals);
  const durationInYears = lockupPeriodInSeconds.toNumber() / 365 / 24 / 60 / 60;
  const interest = nativeToUi(maxRewards, bank.mintDecimals);
  // @todo this needs to be cleaned up, works cleanly when there is no effective compounding right now
  return calculateApyFromInterest(principal, durationInYears, interest);
}

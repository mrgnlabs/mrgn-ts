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

import BigNumber from "bignumber.js";
import { shortenAddress } from ".";
import { Balance, MarginRequirementType } from "../account";
import Bank from "../bank";

function getHealthComponentsWithoutBias(
  activeBalances: Balance[],
  banks: Map<string, Bank>,
  marginReqType: MarginRequirementType
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const [assets, liabilities] = activeBalances
    .map((balance) => {
      const bank = banks.get(balance.bankPk.toBase58());
      if (!bank)
        throw Error(`Bank ${shortenAddress(balance.bankPk)} not found`);
      const { assets, liabilities } = balance.getUsdValue(bank, marginReqType);
      return [assets, liabilities];
    })
    .reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new BigNumber(0), new BigNumber(0)]
    );

  return { assets, liabilities };
}

export function computeNetApr(
  activeBalances: Balance[],
  banks: Map<string, Bank>
): number {
  const { assets, liabilities } = getHealthComponentsWithoutBias(
    activeBalances,
    banks,
    MarginRequirementType.Equity
  );
  const totalUsdValue = assets.minus(liabilities);
  const apr = activeBalances
    .reduce((weightedApr, balance) => {
      const bank = banks.get(balance.bankPk.toBase58());
      if (!bank)
        throw Error(`Bank ${shortenAddress(balance.bankPk)} not found`);
      if (!bank) throw Error(`Bank ${balance.bankPk.toBase58()} not found`);
      return weightedApr
        .minus(
          bank
            .getInterestRates()
            .borrowingRate.times(
              balance.getUsdValue(bank, MarginRequirementType.Equity)
                .liabilities
            )
            .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
        )
        .plus(
          bank
            .getInterestRates()
            .lendingRate.times(
              balance.getUsdValue(bank, MarginRequirementType.Equity).assets
            )
            .div(totalUsdValue.isEqualTo(0) ? 1 : totalUsdValue)
        );
    }, new BigNumber(0))
    .toNumber();

  return apr;
}

// ================ apr/apy conversions ================

const HOURS_PER_YEAR = 365.25 * 24;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param interest {Number} APY (ie. 0.06 for 6%)
 * @param compoundingFrequency {Number} Compounding frequency (times a year)
 * @returns {Number} APR (ie. 0.0582 for APY of 0.06)
 */
export const apyToApr = (apr: number, compoundingFrequency = HOURS_PER_YEAR) =>
  ((1 + apr) ** (1 / compoundingFrequency) - 1) * compoundingFrequency;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apr {Number} APR (ie. 0.0582 for 5.82%)
 * @param compoundingFrequency {Number} Compounding frequency (times a year)
 * @returns {Number} APY (ie. 0.06 for APR of 0.0582)
 */
export const aprToApy = (apr: number, compoundingFrequency = HOURS_PER_YEAR) =>
  (1 + apr / compoundingFrequency) ** compoundingFrequency - 1;

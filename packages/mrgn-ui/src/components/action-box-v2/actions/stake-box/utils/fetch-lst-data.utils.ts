import { LstData, fetchAndParsePricesCsv, getPriceRangeFromPeriod, PERIOD, calcYield } from "@mrgnlabs/mrgn-utils";
import { Connection, PublicKey } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";

const STAKE_POOL_ID = new PublicKey("DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK");
const SOLANA_COMPASS_PRICES_URL =
  "https://raw.githubusercontent.com/glitchful-dev/sol-stake-pool-apy/master/db/lst.csv";
export async function fetchLstData(connection: Connection) {
  try {
    const [stakePoolInfo, stakePoolAccount, solanaCompassPrices] = await Promise.all([
      solanaStakePool.stakePoolInfo(connection, STAKE_POOL_ID),
      solanaStakePool.getStakePoolAccount(connection, STAKE_POOL_ID),
      // fetch(STAKEVIEW_APP_URL).then((res) => res.json()),
      fetchAndParsePricesCsv(SOLANA_COMPASS_PRICES_URL),
    ]);
    const stakePool = stakePoolAccount.account.data;

    const poolTokenSupply = Number(stakePoolInfo.poolTokenSupply);
    const totalLamports = Number(stakePoolInfo.totalLamports);
    const lastPoolTokenSupply = Number(stakePoolInfo.lastEpochPoolTokenSupply);
    const lastTotalLamports = Number(stakePoolInfo.lastEpochTotalLamports);

    const solDepositFee = stakePoolInfo.solDepositFee.denominator.eqn(0)
      ? 0
      : stakePoolInfo.solDepositFee.numerator.toNumber() / stakePoolInfo.solDepositFee.denominator.toNumber();

    const lstSolValue = poolTokenSupply > 0 ? totalLamports / poolTokenSupply : 1;

    let projectedApy: number;
    if (lastTotalLamports === 0 || lastPoolTokenSupply === 0) {
      projectedApy = 0.08;
    } else {
      const priceRange = getPriceRangeFromPeriod(solanaCompassPrices, PERIOD.DAYS_7);
      if (!priceRange) {
        throw new Error("No price data found for the specified period!");
      }
      projectedApy = calcYield(priceRange).apy;
    }

    // commenting out until authorization for stakeview url is approved
    // if (projectedApy < 0.08) {
    //   // temporarily use baseline validator APY waiting for a few epochs to pass
    //   const baselineValidatorData = apyData.validators.find((validator: any) => validator.id === BASELINE_VALIDATOR_ID);
    //   if (baselineValidatorData) projectedApy = baselineValidatorData.apy;
    // }

    return {
      poolAddress: new PublicKey(stakePoolInfo.address),
      tvl: totalLamports / 1e9,
      projectedApy,
      lstSolValue,
      solDepositFee,
      accountData: stakePool,
      validatorList: stakePoolInfo.validatorList.map((v) => new PublicKey(v.voteAccountAddress)),
      updateRequired: stakePoolInfo.details.updateRequired,
      lastUpdateEpoch: stakePoolInfo.lastUpdateEpoch,
    };
  } catch (error) {
    console.error("Error fetching LST data", error);
  }
}

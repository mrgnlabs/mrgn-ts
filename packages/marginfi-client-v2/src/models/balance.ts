import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  OraclePrice,
  MarginRequirementType,
  BalanceRaw,
  BalanceType,
  computeQuantity,
  computeQuantityUi,
  computeClaimedEmissions,
  computeTotalOutstandingEmissions,
  computeBalanceUsdValue,
  getBalanceUsdValueWithPriceBias,
  parseBalanceRaw,
} from "..";
import { Bank } from "./bank";

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class Balance implements BalanceType {
  constructor(
    public active: boolean,
    public bankPk: PublicKey,
    public assetShares: BigNumber,
    public liabilityShares: BigNumber,
    public emissionsOutstanding: BigNumber,
    public lastUpdate: number
  ) {}

  static from(balanceRaw: BalanceRaw): Balance {
    const props = parseBalanceRaw(balanceRaw);
    return new Balance(
      props.active,
      props.bankPk,
      props.assetShares,
      props.liabilityShares,
      props.emissionsOutstanding,
      props.lastUpdate
    );
  }

  static createEmpty(bankPk: PublicKey): Balance {
    return new Balance(false, bankPk, new BigNumber(0), new BigNumber(0), new BigNumber(0), 0);
  }

  computeUsdValue(
    bank: Bank,
    oraclePrice: OraclePrice,
    marginRequirementType = MarginRequirementType.Equity
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeBalanceUsdValue(this, bank, oraclePrice, marginRequirementType);
  }

  getUsdValueWithPriceBias(
    bank: Bank,
    oraclePrice: OraclePrice,
    marginRequirementType = MarginRequirementType.Equity
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return getBalanceUsdValueWithPriceBias(this, bank, oraclePrice, marginRequirementType);
  }

  computeQuantity(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeQuantity(this, bank);
  }

  computeQuantityUi(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return computeQuantityUi(this, bank);
  }

  computeTotalOutstandingEmissions(bank: Bank): BigNumber {
    return computeTotalOutstandingEmissions(this, bank);
  }

  computeClaimedEmissions(bank: Bank, currentTimestamp: number): BigNumber {
    return computeClaimedEmissions(this, bank, currentTimestamp);
  }

  describe(bank: Bank, oraclePrice: OraclePrice): string {
    let { assets: assetsQt, liabilities: liabsQt } = this.computeQuantityUi(bank);
    let { assets: assetsUsd, liabilities: liabsUsd } = this.computeUsdValue(
      bank,
      oraclePrice,
      MarginRequirementType.Equity
    );

    return `> ${bank.tokenSymbol ?? bank.address} balance:
\t- Deposits: ${assetsQt.toFixed(5)} (${assetsUsd.toFixed(5)} USD)
\t- Borrows: ${liabsQt.toFixed(5)} (${liabsUsd.toFixed(5)} USD)
`;
  }
}

export { Balance };

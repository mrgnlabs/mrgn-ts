import { WrappedI80F48, wrappedI80F48toBigNumber, nativeToUi } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { OraclePrice, MarginRequirementType, PriceBias } from "..";
import { Bank } from "./bank";
import BN from "bn.js";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface BalanceRaw {
  active: boolean;
  bankPk: PublicKey;
  assetShares: WrappedI80F48;
  liabilityShares: WrappedI80F48;
  emissionsOutstanding: WrappedI80F48;
  lastUpdate: BN;
}

export type { BalanceRaw };

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class Balance {
  public active: boolean;
  public bankPk: PublicKey;
  public assetShares: BigNumber;
  public liabilityShares: BigNumber;
  public emissionsOutstanding: BigNumber;
  public lastUpdate: number;

  constructor(
    active: boolean,
    bankPk: PublicKey,
    assetShares: BigNumber,
    liabilityShares: BigNumber,
    emissionsOutstanding: BigNumber,
    lastUpdate: number
  ) {
    this.active = active;
    this.bankPk = bankPk;
    this.assetShares = assetShares;
    this.liabilityShares = liabilityShares;
    this.emissionsOutstanding = emissionsOutstanding;
    this.lastUpdate = lastUpdate;
  }

  static from(balanceRaw: BalanceRaw): Balance {
    const active = balanceRaw.active;
    const bankPk = balanceRaw.bankPk;
    const assetShares = wrappedI80F48toBigNumber(balanceRaw.assetShares);
    const liabilityShares = wrappedI80F48toBigNumber(balanceRaw.liabilityShares);
    const emissionsOutstanding = wrappedI80F48toBigNumber(balanceRaw.emissionsOutstanding);
    const lastUpdate = balanceRaw.lastUpdate.toNumber();

    return new Balance(active, bankPk, assetShares, liabilityShares, emissionsOutstanding, lastUpdate);
  }

  static createEmpty(bankPk: PublicKey): Balance {
    return new Balance(false, bankPk, new BigNumber(0), new BigNumber(0), new BigNumber(0), 0);
  }

  computeUsdValue(
    bank: Bank,
    oraclePrice: OraclePrice,
    marginRequirementType: MarginRequirementType = MarginRequirementType.Equity
  ): { assets: BigNumber; liabilities: BigNumber } {
    const assetsValue = bank.computeAssetUsdValue(oraclePrice, this.assetShares, marginRequirementType, PriceBias.None);
    const liabilitiesValue = bank.computeLiabilityUsdValue(
      oraclePrice,
      this.liabilityShares,
      marginRequirementType,
      PriceBias.None
    );
    return { assets: assetsValue, liabilities: liabilitiesValue };
  }

  getUsdValueWithPriceBias(
    bank: Bank,
    oraclePrice: OraclePrice,
    marginRequirementType: MarginRequirementType = MarginRequirementType.Equity
  ): { assets: BigNumber; liabilities: BigNumber } {
    const assetsValue = bank.computeAssetUsdValue(
      oraclePrice,
      this.assetShares,
      marginRequirementType,
      PriceBias.Lowest
    );
    const liabilitiesValue = bank.computeLiabilityUsdValue(
      oraclePrice,
      this.liabilityShares,
      marginRequirementType,
      PriceBias.Highest
    );
    return { assets: assetsValue, liabilities: liabilitiesValue };
  }

  computeQuantity(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const assetsQuantity = bank.getAssetQuantity(this.assetShares);
    const liabilitiesQuantity = bank.getLiabilityQuantity(this.liabilityShares);
    return { assets: assetsQuantity, liabilities: liabilitiesQuantity };
  }

  computeQuantityUi(bank: Bank): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    const assetsQuantity = new BigNumber(nativeToUi(bank.getAssetQuantity(this.assetShares), bank.mintDecimals));
    const liabilitiesQuantity = new BigNumber(
      nativeToUi(bank.getLiabilityQuantity(this.liabilityShares), bank.mintDecimals)
    );
    return { assets: assetsQuantity, liabilities: liabilitiesQuantity };
  }

  computeTotalOutstandingEmissions(bank: Bank): BigNumber {
    const claimedEmissions = this.emissionsOutstanding;
    const unclaimedEmissions = this.computeClaimedEmissions(bank, Date.now() / 1000);
    return claimedEmissions.plus(unclaimedEmissions);
  }

  computeClaimedEmissions(bank: Bank, currentTimestamp: number): BigNumber {
    const lendingActive = bank.emissionsActiveLending;
    const borrowActive = bank.emissionsActiveBorrowing;

    const { assets, liabilities } = this.computeQuantity(bank);

    let balanceAmount: BigNumber | null = null;

    if (lendingActive) {
      balanceAmount = assets;
    } else if (borrowActive) {
      balanceAmount = liabilities;
    }

    if (balanceAmount) {
      const lastUpdate = this.lastUpdate;
      const period = new BigNumber(currentTimestamp - lastUpdate);
      const emissionsRate = new BigNumber(bank.emissionsRate);
      const emissions = period
        .times(balanceAmount)
        .times(emissionsRate)
        .div(31_536_000 * Math.pow(10, bank.mintDecimals));
      const emissionsReal = BigNumber.min(emissions, new BigNumber(bank.emissionsRemaining));

      return emissionsReal;
    }

    return new BigNumber(0);
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

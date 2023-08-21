import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { MarginRequirementType } from "../account";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { Bank } from "./pod";
import { PriceBias, PriceInfo, parseOraclePriceData } from "../price";

class BankProxy {
  public readonly publicKey: PublicKey;

  public bank: Bank;
  public priceInfo: PriceInfo;
  private emissionMintDecimals: number | null = null;

  constructor(address: PublicKey, bank: Bank, priceInfo: PriceInfo, emissionMintDecimals?: number) {
    this.publicKey = address;
    this.bank = bank;
    this.priceInfo = priceInfo;
    if (emissionMintDecimals) this.emissionMintDecimals = emissionMintDecimals;
  }

  get mint(): PublicKey {
    return this.bank.mint;
  }

  public async reloadPriceData(connection: Connection) {
    const oracleKey = this.bank.config.oracleKeys[0]; // NOTE: This will break if/when we start having more than 1 oracle key per bank
    const account = await connection.getAccountInfo(oracleKey);
    if (!account) throw new Error(`Failed to fetch oracle account ${oracleKey.toBase58()}`);
    this.priceInfo = await parseOraclePriceData(this.bank.config.oracleSetup, account.data);
  }

  get totalAssets(): BigNumber {
    return this.bank.getTotalAssetQuantity();
  }

  get totalLiabilities(): BigNumber {
    return this.bank.getTotalLiabilityQuantity();
  }

  public getAssetQuantity(assetShares: BigNumber): BigNumber {
    return this.bank.getAssetQuantity(assetShares);
  }

  public getLiabilityQuantity(liabilityShares: BigNumber): BigNumber {
    return this.bank.getLiabilityQuantity(liabilityShares);
  }

  public getAssetShares(assetQuantity: BigNumber): BigNumber {
    return this.bank.getAssetShares(assetQuantity);
  }

  public getLiabilityShares(liabilityQuantity: BigNumber): BigNumber {
    return this.bank.getLiabilityShares(liabilityQuantity);
  }

  public getAssetUsdValue(
    assetShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    return this.bank.computeAssetUsdValue(this.priceInfo, assetShares, marginRequirementType, priceBias);
  }

  public getLiabilityUsdValue(
    liabilityShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    return this.bank.computeLiabilityUsdValue(this.priceInfo, liabilityShares, marginRequirementType, priceBias);
  }

  public getUsdValue(quantity: BigNumber, priceBias: PriceBias, weight?: BigNumber, scaleToBase = true): BigNumber {
    return this.bank.computeUsdValue(this.priceInfo, quantity, priceBias, weight, scaleToBase);
  }

  public getPrice(priceBias: PriceBias = PriceBias.None): BigNumber {
    return this.bank.getPrice(this.priceInfo, priceBias);
  }

  public getAssetWeight(marginRequirementType: MarginRequirementType): BigNumber {
    return this.bank.getAssetWeight(marginRequirementType);
  }

  public getLiabilityWeight(marginRequirementType: MarginRequirementType): BigNumber {
    return this.bank.getLiabilityWeight(marginRequirementType);
  }

  public getQuantityFromUsdValue(usdValue: BigNumber, priceBias: PriceBias): BigNumber {
    const price = this.getPrice(priceBias);
    return usdValue.div(price);
  }

  public getInterestRates(): {
    lendingRate: BigNumber;
    borrowingRate: BigNumber;
  } {
    return this.bank.computeInterestRates();
  }

  public async getEmissionsData(): Promise<{
    lendingActive: boolean;
    borrowingActive: boolean;
    rateUi: BigNumber;
    remainingUi: BigNumber;
  }> {
    if (!this.emissionMintDecimals) throw new Error("Emission mint decimals not set");

    const remainingUi = this.bank.emissionsRemaining.div(10 ** this.emissionMintDecimals);
    let rateUi = this.bank.emissionsRate / 10 ** this.emissionMintDecimals;

    let bankMintDiff = this.bank.mintDecimals - 6;
    if (bankMintDiff > 0) {
      rateUi = rateUi * 10 ** bankMintDiff;
    } else if (bankMintDiff < 0) {
      rateUi = rateUi * 10 ** bankMintDiff;
    }

    return {
      lendingActive: this.bank.emissionsActiveLending,
      borrowingActive: this.bank.emissionsActiveBorrowing,
      rateUi: new BigNumber(rateUi),
      remainingUi,
    };
  }

  public describe(): string {
    return `
Bank address: ${this.publicKey.toBase58()}
Mint: ${this.bank.mint.toBase58()}, decimals: ${this.bank.mintDecimals}

Total deposits: ${nativeToUi(this.totalAssets, this.bank.mintDecimals)}
Total borrows: ${nativeToUi(this.totalLiabilities, this.bank.mintDecimals)}

Total assets (USD value): ${this.getAssetUsdValue(
      this.bank.totalAssetShares,
      MarginRequirementType.Equity,
      PriceBias.None
    )}
Total liabilities (USD value): ${this.getLiabilityUsdValue(
      this.bank.totalLiabilityShares,
      MarginRequirementType.Equity,
      PriceBias.None
    )}

Asset price (USD): ${this.getPrice(PriceBias.None)}

Config:
- Asset weight init: ${this.bank.config.assetWeightInit.toFixed(2)}
- Asset weight maint: ${this.bank.config.assetWeightMaint.toFixed(2)}
- Liability weight init: ${this.bank.config.liabilityWeightInit.toFixed(2)}
- Liability weight maint: ${this.bank.config.liabilityWeightMaint.toFixed(2)}

- Deposit limit: ${this.bank.config.depositLimit}
- Borrow limit: ${this.bank.config.borrowLimit}

LTVs:
- Initial: ${new BigNumber(1).div(this.bank.config.liabilityWeightInit).times(100).toFixed(2)}%
- Maintenance: ${new BigNumber(1).div(this.bank.config.liabilityWeightMaint).times(100).toFixed(2)}%
`;
  }
}

export { BankProxy };

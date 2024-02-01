import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";
import { useMemo } from "react";
import { nativeToUi, percentFormatter } from "@mrgnlabs/mrgn-common";
import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

export function useAssetItemData({ bank, isInLendingMode }: { bank: ExtendedBankInfo; isInLendingMode: boolean }) {
  const rateAP = useMemo(() => {
    const { lendingRate, borrowingRate, emissions, emissionsRate } = bank.info.state;
    const { protocolFixedFeeApr } = bank.info.rawBank.config.interestRateConfig;

    const baseRate = isInLendingMode ? lendingRate : borrowingRate;
    const protocolFee =
      !isInLendingMode && protocolFixedFeeApr && protocolFixedFeeApr?.isZero && !protocolFixedFeeApr.isZero()
        ? protocolFixedFeeApr.toNumber()
        : 0;
    const lendingEmissions = isInLendingMode && emissions == Emissions.Lending ? emissionsRate : 0;
    const borrowingEmissions = !isInLendingMode && emissions == Emissions.Borrowing ? emissionsRate : 0;

    const totalRate = baseRate + protocolFee + lendingEmissions + borrowingEmissions;

    return percentFormatter.format(totalRate);
  }, [isInLendingMode, bank.info.state, bank.info.rawBank.config.interestRateConfig]);

  const assetWeight = useMemo(() => {
    if (!bank.info.rawBank.getAssetWeight) {
      return "-";
    }
    const assetWeightInit = bank.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice)
      .toNumber();

    if (assetWeightInit <= 0) {
      return "-";
    }
    return isInLendingMode
      ? (assetWeightInit * 100).toFixed(0) + "%"
      : ((1 / bank.info.rawBank.config.liabilityWeightInit.toNumber()) * 100).toFixed(0) + "%";
  }, [bank.info.rawBank, bank.info.oraclePrice, isInLendingMode]);

  const bankCap = useMemo(
    () =>
      nativeToUi(
        isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
        bank.info.state.mintDecimals
      ),
    [
      isInLendingMode,
      bank.info.rawBank.config.depositLimit,
      bank.info.rawBank.config.borrowLimit,
      bank.info.state.mintDecimals,
    ]
  );
  const isBankFilled = useMemo(
    () => (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.99999,
    [bankCap, isInLendingMode, bank.info.state]
  );
  const isBankHigh = useMemo(
    () => (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.9,
    [bankCap, isInLendingMode, bank.info.state]
  );

  return { rateAP, assetWeight, bankCap, isBankFilled, isBankHigh };
}

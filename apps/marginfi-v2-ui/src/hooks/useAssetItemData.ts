import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";
import { useMemo } from "react";
import { nativeToUi, percentFormatter } from "@mrgnlabs/mrgn-common";
import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

export function useAssetItemData({
  bank,
  isInLendingMode,
}: {
  bank: ExtendedBankInfo | null;
  isInLendingMode: boolean;
}) {
  const rateAP = useMemo(
    () =>
      bank
        ? percentFormatter.format(
            (isInLendingMode ? bank.info.state.lendingRate : bank.info.state.borrowingRate) +
              (isInLendingMode && bank.info.state.emissions == Emissions.Lending ? bank.info.state.emissionsRate : 0) +
              (!isInLendingMode && bank.info.state.emissions == Emissions.Borrowing ? bank.info.state.emissionsRate : 0)
          )
        : 0,
    [isInLendingMode, bank.info.state]
  );

  const assetWeight = useMemo(() => {
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

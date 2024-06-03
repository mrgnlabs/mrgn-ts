import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";
import { useMemo } from "react";
import { aprToApy, nativeToUi, percentFormatter } from "@mrgnlabs/mrgn-common";
import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

export function useAssetItemData({ bank, isInLendingMode }: { bank: ExtendedBankInfo; isInLendingMode: boolean }) {
  const rateAPR = useMemo(() => {
    if (!bank?.info?.state) return 0;
    const { lendingRate, borrowingRate, emissions, emissionsRate } = bank.info.state;

    const interestRate = isInLendingMode ? lendingRate : borrowingRate;
    const emissionRate = isInLendingMode
      ? emissions == Emissions.Lending
        ? emissionsRate
        : 0
      : emissions == Emissions.Borrowing
      ? emissionsRate
      : 0;

    return interestRate + emissionRate;
  }, [isInLendingMode, bank?.info?.state]);

  const rateAPY = useMemo(() => {
    return aprToApy(rateAPR);
  }, [rateAPR]);

  const rateAP = useMemo(() => percentFormatter.format(rateAPY), [rateAPY]);

  const assetWeight = useMemo(() => {
    if (!bank?.info?.rawBank?.getAssetWeight) {
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
  }, [bank?.info?.rawBank, bank?.info?.oraclePrice, isInLendingMode]);

  const bankCap = useMemo(() => {
    if (!bank?.info?.rawBank?.config?.depositLimit) return 0;
    return nativeToUi(
      isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
      bank.info.state.mintDecimals
    );
  }, [
    isInLendingMode,
    bank?.info?.rawBank.config.depositLimit,
    bank?.info?.rawBank.config.borrowLimit,
    bank?.info?.state.mintDecimals,
  ]);
  const isBankFilled = useMemo(() => {
    if (!bank?.info?.state) return false;
    return (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.99999;
  }, [bankCap, isInLendingMode, bank?.info?.state]);
  const isBankHigh = useMemo(() => {
    if (!bank?.info?.state) return false;
    return (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.9;
  }, [bankCap, isInLendingMode, bank?.info?.state]);

  return { rateAP, assetWeight, bankCap, isBankFilled, isBankHigh };
}

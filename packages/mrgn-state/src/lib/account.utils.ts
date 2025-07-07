import { MarginfiAccountWrapper, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "../types";

export function computeAccountSummary(marginfiAccount: MarginfiAccountWrapper): AccountSummary {
  const equityComponents = marginfiAccount.computeHealthComponents(MarginRequirementType.Equity);
  const maintenanceComponents = marginfiAccount.computeHealthComponents(MarginRequirementType.Maintenance);

  const signedFreeCollateral = marginfiAccount.computeFreeCollateral({ clamped: false });

  const healthFactor = maintenanceComponents.assets.isZero()
    ? 1
    : maintenanceComponents.assets
        .minus(maintenanceComponents.liabilities)
        .dividedBy(maintenanceComponents.assets)
        .toNumber();

  return {
    healthFactor: healthFactor,
    balanceEquity: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
    lendingAmountEquity: equityComponents.assets.toNumber(),
    borrowingAmountEquity: equityComponents.liabilities.toNumber(),
    lendingAmountMaintenance: maintenanceComponents.assets.toNumber(),
    borrowingAmountMaintenance: maintenanceComponents.liabilities.toNumber(),
    apy: marginfiAccount.computeNetApy(),
    signedFreeCollateral: signedFreeCollateral.toNumber(),
    healthSimFailed: !!marginfiAccount.pureAccount.healthCache.simulationFailed,
  };
}

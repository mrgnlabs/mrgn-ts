import { EmodeImpactStatus } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

export function getEmodeStrategies(extendedBanks: ExtendedBankInfo[]) {
  const repayAllImpacts: ExtendedBankInfo[] = [];
  const borrowImpacts: ExtendedBankInfo[] = [];
  const supplyImpacts: ExtendedBankInfo[] = [];
  const blockingBorrowEmodeBanks: ExtendedBankInfo[] = [];
  const activateBorrowEmodeBanks: ExtendedBankInfo[] = [];
  const activateSupplyEmodeBanks: ExtendedBankInfo[] = [];

  for (const bank of extendedBanks) {
    const impact = bank.userInfo.emodeImpact;
    if (!impact) continue;

    if (impact.repayAllImpact) {
      repayAllImpacts.push(bank);
      if (impact.repayAllImpact.status === EmodeImpactStatus.ActivateEmode) {
        blockingBorrowEmodeBanks.push(bank);
      }
    }

    if (impact.borrowImpact) {
      borrowImpacts.push(bank);
      if (impact.borrowImpact.status === EmodeImpactStatus.ActivateEmode) {
        activateBorrowEmodeBanks.push(bank);
      }
    }

    if (impact.supplyImpact) {
      supplyImpacts.push(bank);
      if (impact.supplyImpact.status === EmodeImpactStatus.ActivateEmode) {
        activateSupplyEmodeBanks.push(bank);
      }
    }
  }

  return {
    blockingBorrowEmodeBanks,
    activateBorrowEmodeBanks,
    activateSupplyEmodeBanks,
  };
}

import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useMemo } from "react";
import { usdFormatter, groupedNumberFormatter } from "~/utils/formatters";
// import { AccountBalance, MobileHealth } from "./AccountBalance";
import { PointsMetric } from "./PointsMetric";
// import { HealthFactor } from "./HealthMonitor";
import { useUserAccounts } from "~/context";

const PointsSummary: FC = () => {
  const { accountSummary, selectedAccount } = useUserAccounts();
  const { extendedBankInfos } = useUserAccounts();
  const wallet = useWallet();

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.getHealthComponents(MarginRequirementType.Maint);
      return assets.isZero() ? 1 : assets.minus(liabilities).dividedBy(assets).toNumber();
    } else {
      return 1;
    }
  }, [selectedAccount]);

  return (
    <div className="col-span-full">
      <div
        className="flex flex-row flex-wrap justify-center w-full sm:min-w-[400px] p-0 items-center gap-3 xl:gap-0 font-light"
        style={{
          fontFamily: "Aeonik Pro",
        }}
      >
        <div className="h-[112px] w-full sm:min-w-[392px] sm:w-[38%] flex flex-row justify-between xl:pt-0 h-full bg-[#0E1113] rounded-xl">
          <PointsMetric
            label={"Lending"}
            value={wallet.connected ? usdFormatter.format(accountSummary.lendingAmount) : "-"}
          />
          <PointsMetric
            label={"Borrowing"}
            value={wallet.connected ? usdFormatter.format(accountSummary.borrowingAmount) : "-"}
          />
        </div>
      </div>
    </div>
  );
};

export { PointsSummary };

import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useMemo } from "react";
import { usdFormatter, groupedNumberFormatter } from "~/utils/formatters";
import { AccountBalance, MobileHealth } from "./AccountBalance";
import { AccountMetric, RewardMetric } from "./AccountMetric";
import { HealthFactor } from "./HealthMonitor";
import { useUserAccounts } from "~/context";

const AccountSummary: FC = () => {
  const { accountSummary, selectedAccount } = useUserAccounts();
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
        className="flex flex-row flex-wrap justify-start xl:justify-between w-full sm:min-w-[400px] p-0 items-center gap-3 xl:gap-0 font-light"
        style={{
          fontFamily: "Aeonik Pro",
        }}
      >
        {/* Mobile */}
        <div className="flex sm:hidden flex-row items-center w-full">
          <AccountBalance isConnected={wallet.connected} accountBalance={accountSummary.balance} />
          <MobileHealth isConnected={wallet.connected} healthFactor={healthFactor} />
        </div>
        {/* Desktop */}
        <div className="hidden sm:flex">
          <AccountBalance isConnected={wallet.connected} accountBalance={accountSummary.balance} />
        </div>

        <div className="h-[112px] w-full sm:min-w-[392px] sm:w-[38%] flex flex-row justify-between xl:pt-0 h-full bg-[#0E1113] rounded-xl">
          <RewardMetric
            value={wallet.connected ? groupedNumberFormatter.format(accountSummary.outstandingUxpEmissions) + " " + 'UXP' : "-"}
          />
          <AccountMetric
            label={"Lending"}
            value={wallet.connected ? usdFormatter.format(accountSummary.lendingAmount) : "-"}
          />
          <AccountMetric
            label={"Borrowing"}
            value={wallet.connected ? usdFormatter.format(accountSummary.borrowingAmount) : "-"}
          />
        </div>
        <HealthFactor healthFactor={healthFactor} />
      </div>
    </div>
  );
};

export { AccountSummary };

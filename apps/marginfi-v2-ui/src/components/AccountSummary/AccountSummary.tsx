import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2/src/account";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useMemo } from "react";
import { signedPercentFormatter, usdFormatter } from "~/utils";
import { useBorrowLendState } from "../../context/BorrowLend";
import { AccountBalance } from "./AccountBalance";
import { AccountMetric } from "./AccountMetric";
import { HealthFactor } from "./HealthMonitor";

const AccountSummary: FC = () => {
  const { accountSummary, selectedAccount } = useBorrowLendState();
  const wallet = useWallet();

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.getHealthComponents(
        MarginRequirementType.Maint
      );
      return assets.minus(liabilities).dividedBy(assets).toNumber();
    } else {
      return 0;
    }
  }, [selectedAccount]);

  return (
    <div className="col-span-full">
      <div
        className="flex flex-row flex-wrap justify-start xl:justify-between w-full min-w-[400px] p-0 items-center gap-3 xl:gap-0 font-light"
        style={{
          fontFamily: "Aeonik Pro",
        }}
      >
        <AccountBalance
          isConnected={wallet.connected}
          accountBalance={accountSummary.balance}
        />
        <div className="h-[112px] min-w-[392px] w-[38%] flex flex-row justify-between xl:pt-0 h-full bg-[#0E1113] rounded-xl">
          <AccountMetric
            label={"Lending"}
            value={
              wallet.connected
                ? usdFormatter.format(accountSummary.lendingAmount)
                : "-"
            }
          />
          <AccountMetric
            label={"Borrowing"}
            value={
              wallet.connected
                ? usdFormatter.format(accountSummary.borrowingAmount)
                : "-"
            }
          />
          <AccountMetric
            label={"Net APY"}
            value={
              wallet.connected
                ? signedPercentFormatter.format(
                    Math.round(accountSummary.apy * 1_000_000) / 1_000_000
                  )
                : "-"
            }
            valueBold
            boldValue={accountSummary.apy >= 0 ? "#75ba80" : "#bd4d4d"}
          />
        </div>

        <HealthFactor healthFactor={healthFactor} />
      </div>
    </div>
  );
};

export { AccountSummary };

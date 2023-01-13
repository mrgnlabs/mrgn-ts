import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC } from "react";
import { percentFormatter, usdFormatter } from "~/utils";
import { useBorrowLendState } from "../../context/BorrowLendContext";
import { AccountBalance } from "./AccountBalance";
import { AccountMetric } from "./AccountMetric";

const AccountSummary: FC = () => {
  const { accountSummary } = useBorrowLendState();
  const wallet = useWallet();

  return (
    <div className="col-span-full">
      <div
        className="flex flex-row flex-wrap justify-between w-3/5 min-w-[400px] p-0 items-center gap-2 xl:gap-0"
        style={{
          fontFamily: "Aeonik Pro Light",
        }}
      >
        <AccountBalance
          isConnected={wallet.connected}
          accountBalance={accountSummary.balance}
        />
        <div className="h-[112px] min-w-[392px] w-3/5 flex flex-row justify-between xl:pt-0 h-full bg-[#0E1113] rounded-xl">
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
                ? percentFormatter.format(accountSummary.apy)
                : "-"
            }
            valueBold
            extraBorder={true}
          />
        </div>
      </div>
    </div>
  );
};

export { AccountSummary };

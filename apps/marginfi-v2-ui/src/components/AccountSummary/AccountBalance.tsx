import React, { FC } from "react";
import { usdFormatter } from "~/utils";

interface AccountBalanceProps {
  isConnected: boolean;
  accountBalance: number;
}

const AccountBalance: FC<AccountBalanceProps> = ({
  accountBalance,
  isConnected,
}) => {
  return (
    <div
      className="min-w-[39%] bg-[#131619] rounded-xl h-full flex flex-col justify-evenly items-start px-[4%] pl-1 py-1 h-[112px]"
    >
      <div className="text-lg text-[#868E95]">Account balance</div>
      <div className="text-5xl">
        {isConnected ? usdFormatter.format(accountBalance) : "-"}
      </div>
    </div>
  );
};

export { AccountBalance };

import React, { FC } from "react";
import { usdFormatter } from "~/utils/formatters";

interface AccountBalanceProps {
  isConnected: boolean;
  accountBalance: number;
}

const AccountBalance: FC<AccountBalanceProps> = ({ accountBalance, isConnected }) => {
  return (
    <div className="min-w-[50%] sm:w-[25%] sm:min-w-[220px] rounded-xl h-full flex flex-col justify-evenly items-start px-[4%] pl-2 py-1 h-[112px]">
      <div className="text-lg text-[#868E95]">Account balance</div>
      <div className="text-3xl sm:text-5xl">{isConnected ? usdFormatter.format(accountBalance) : "-"}</div>
    </div>
  );
};

interface MobileHealthProps {
  isConnected: boolean;
  healthFactor: number;
}

const MobileHealth: FC<MobileHealthProps> = ({ healthFactor, isConnected }) => {
  return (
    <div className="min-w-[50%] sm:w-[25%] sm:min-w-[220px] rounded-xl h-full flex flex-col justify-evenly items-start px-[4%] pl-2 py-1 h-[112px]">
      <div className="text-lg text-[#868E95]">Health</div>
      <div
        className="text-3xl"
        style={{
          color: isConnected ? `rgba(${255 * (1 - healthFactor)}, ${255 * healthFactor}, 100)` : "#fff",
          fontWeight: 500,
        }}
      >
        {isConnected ? `${Math.round(healthFactor * 100)}%` : "-"}
      </div>
    </div>
  );
};

export { AccountBalance, MobileHealth };

import React, { FC } from "react";
import { usdFormatter } from "~/utils/formatters";

interface AccountBalanceProps {
  isConnected: boolean;
  accountBalance: number;
}

const AccountBalance: FC<AccountBalanceProps> = ({ accountBalance, isConnected }) => {
  return (
    <div className="min-w-[60%] sm:w-[20%] sm:min-w-[220px] rounded-xl h-[112px] flex flex-col justify-evenly items-start px-[4%] pl-2 py-3">
      <div className="text-lg text-[#868E95]">Account Balance</div>
      <div className="text-3xl">{isConnected ? usdFormatter.format(accountBalance) : "-"}</div>
    </div>
  );
};

interface MobileHealthProps {
  isConnected: boolean;
  healthFactor: number;
}

const MobileHealth: FC<MobileHealthProps> = ({ healthFactor, isConnected }) => {
  return (
    <div className="min-w-[40%] sm:w-[20%] sm:min-w-[220px] rounded-xl h-[112px] flex flex-col justify-evenly items-start px-[4%] pl-2 py-3">
      <div className="text-lg text-[#868E95]">Health</div>
      <div
        className="text-3xl"
        style={{
          color: isConnected ? `rgba(${255 * (1 - healthFactor)}, ${255 * healthFactor}, 100)` : '#fff',
          fontWeight: 500,
        }}
      >{isConnected ? `${Math.round(healthFactor * 100)}%` : "-"}</div>
    </div>
  );
};

export { AccountBalance, MobileHealth };

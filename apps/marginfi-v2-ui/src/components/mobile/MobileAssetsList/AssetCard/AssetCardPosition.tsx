import React, { FC, useState } from "react";

import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const AssetCardPosition: FC<{
  activeBank: ActiveBankInfo;
}> = ({ activeBank }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  return (
    <div className="flex flex-col bg-[#23272B] p-[12px] rounded-lg">
      <div className="flex flex-row justify-between ">
        <div className="my-auto">Your position details</div>
        <span className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </span>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col gap-[8px] pt-[8px]">
          <div className="flex flex-row justify-between">
            <div className="text-[#A1A1A1] my-auto text-sm">
              {(activeBank as ActiveBankInfo).position.isLending ? "Lending" : "Borrowing"}
            </div>
            <div className="text-primary text-sm my-auto">
              {(activeBank as ActiveBankInfo).position.amount.toFixed(activeBank.info.state.mintDecimals) +
                " " +
                activeBank.meta.tokenSymbol}
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <div className="text-[#A1A1A1] text-sm my-auto">USD value</div>
            <div className="text-sm my-auto">
              {usdFormatter.format((activeBank as ActiveBankInfo).position.usdValue)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

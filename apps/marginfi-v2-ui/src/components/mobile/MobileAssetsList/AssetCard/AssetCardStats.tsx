import React, { FC } from "react";
import Image from "next/image";
import Typography from "@mui/material/Typography";

import { groupedNumberFormatterDyn, numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";

export const AssetCardStats: FC<{
  bank: ExtendedBankInfo;
  assetWeight: string;
  totalDepositsOrBorrows: number;
  userBalance: number;
  isBankFilled: boolean;
  isBankHigh: boolean;
  bankCap: number;
  isInLendingMode: boolean;
}> = ({
  bank,
  assetWeight,
  totalDepositsOrBorrows,
  userBalance,
  isBankFilled,
  isBankHigh,
  bankCap,
  isInLendingMode,
}) => {
  return (
    <div className="flex flex-row justify-between">
      <div className="flex flex-col min-w-[77px]">
        <div className="font-normal text-sm text-[#A1A1A1] flex gap-1">
          {isInLendingMode ? "Weight" : "LTV"}
          <div>
            <MrgnTooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                    {isInLendingMode ? "Weight" : "LTV"}
                  </Typography>
                  <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                    {isInLendingMode
                      ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                      : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
                  </span>
                </React.Fragment>
              }
              placement="top"
            >
              <Image src="/info_icon.png" alt="info" height={16} width={16} />
            </MrgnTooltip>
          </div>
        </div>
        <div className="font-medium text-base">{assetWeight}</div>
      </div>
      <Separator />
      <div className="flex flex-col min-w-[77px] ">
        <div className="font-normal text-sm text-[#A1A1A1] flex gap-1">
          {isInLendingMode ? "Deposits" : "Available"}
          <div>
            <MrgnTooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                    {isInLendingMode ? "Total deposits" : "Total available"}
                  </Typography>
                  <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                    {isInLendingMode
                      ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                      : "The amount of tokens available to borrow for each asset. Calculated as the minimum of the asset's borrow limit and available liquidity that has not yet been borrowed."}
                  </span>
                </React.Fragment>
              }
              placement="top"
            >
              <Image src="/info_icon.png" alt="info" height={16} width={16} />
            </MrgnTooltip>
          </div>
        </div>
        <div className="font-medium text-base">{numeralFormatter(totalDepositsOrBorrows)}</div>
        {isBankHigh && (
          <div className={`${isBankFilled ? "text-[#e07d6f]" : "text-[#daa204]"} text-xs`}>
            {percentFormatterDyn.format(
              (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankCap
            ) + " FILLED"}
          </div>
        )}
      </div>
      <Separator />
      <div className="flex flex-col min-w-[77px]">
        <div className="font-normal text-sm text-[#A1A1A1]">Your Balance</div>
        <div className="font-medium text-base">{groupedNumberFormatterDyn.format(userBalance) + " " + bank.meta.tokenSymbol}</div>
      </div>
    </div>
  );
};

function Separator() {
  return <div className={"border-l border-[#555] mx-[12px] w-[1px"}></div>;
}

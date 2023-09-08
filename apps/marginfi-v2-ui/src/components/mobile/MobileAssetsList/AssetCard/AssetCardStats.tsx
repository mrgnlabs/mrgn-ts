import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { TableCell, TableRow } from "@mui/material";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import Badge from "@mui/material/Badge";

import {
  WSOL_MINT,
  groupedNumberFormatterDyn,
  numeralFormatter,
  percentFormatter,
  uiToNative,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType, getCurrentAction, ExtendedBankMetadata } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, PriceBias } from "@mrgnlabs/marginfi-client-v2";

export const AssetCardStats: FC<{
  bank: ExtendedBankInfo;
  assetWeight: string;
  totalDepositsOrBorrows: number;
  userBalance: number;
  isBankFilled: boolean;
  isBankHigh: boolean;
  bankFilled: number;
  isInLendingMode: boolean;
}> = ({
  bank,
  assetWeight,
  totalDepositsOrBorrows,
  userBalance,
  isBankFilled,
  isBankHigh,
  bankFilled,
  isInLendingMode,
}) => {
  console.log({ totalDepositsOrBorrows });
  return (
    <div className="flex flex-row">
      <div className="flex flex-col min-w-77px">
        <div className="font-normal text-sm text-tertiary">Weight</div>
        <div className="font-medium text-base text-primary">{assetWeight}</div>
      </div>
      {/* TODO: Add seperator */}
      <div className="flex flex-col min-w-77px">
        <div className="font-normal text-sm text-tertiary">{isInLendingMode ? "Deposits" : "Available"}</div>
        <div className="font-medium text-base text-primary">{numeralFormatter(totalDepositsOrBorrows)}</div>
        {isBankHigh && (
          <div className={isBankFilled ? "text-[#e07d6f]" : "text-[#daa204]"}>
            {percentFormatter.format(
              (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankFilled
            )}
          </div>
        )}
      </div>
      {/* TODO: Add seperator */}
      <div className="flex flex-col min-w-77px">
        <div className="font-normal text-sm text-tertiary">Your Balance</div>
        <div className="font-medium text-base text-primary">{userBalance + " " + bank.meta.tokenSymbol}</div>
      </div>
    </div>
  );
};

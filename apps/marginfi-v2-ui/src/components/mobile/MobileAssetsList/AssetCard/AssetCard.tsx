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

import { borrowOrLend, closeBalance } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { HtmlTooltip } from "~/components/common/HtmlTooltip";
import { AssetCardStats } from "./AssetCardStats";

export const AssetCard: FC<{
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  marginfiAccount: MarginfiAccountWrapper | null;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  hasHotkey: boolean;
  showHotkeyBadges?: boolean;
  badgeContent?: string;
}> = ({
  bank,
  nativeSolBalance,
  isInLendingMode,
  marginfiAccount,
  inputRefs,
  hasHotkey,
  showHotkeyBadges,
  badgeContent,
}) => {
  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankFilled } = useAssetItemData({ bank, isInLendingMode });

  const totalDepositsOrBorrows = useMemo(
    () =>
      isInLendingMode
        ? bank.info.state.totalDeposits
        : Math.max(
            0,
            Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit) - bank.info.state.totalBorrows
          ),
    [isInLendingMode, bank.info]
  );

  const userBalance = useMemo(
    () =>
      bank.info.state.mint.equals(WSOL_MINT)
        ? bank.userInfo.tokenAccount.balance + nativeSolBalance
        : bank.userInfo.tokenAccount.balance,
    [bank.info.state.mint, bank.userInfo.tokenAccount, nativeSolBalance]
  );

  return (
    <div className="bg-[#171C1F] rounded-xl px-[12px] py-[16px] flex flex-col gap-[16px] ">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row gap-[7px]">
          <div>
            {bank.meta.tokenLogoUri && (
              <Image src={bank.meta.tokenLogoUri} alt={bank.meta.tokenSymbol} height={40} width={40} />
            )}
          </div>
          <div className="flex flex-col">
            <div className="text-base">{bank.meta.tokenSymbol}</div>
            <div className="text-tertiary text-[#A1A1A1]">{usdFormatter.format(bank.info.state.price)}</div>
          </div>
        </div>
        <div className={`text-${isInLendingMode ? "success" : "error"} text-base my-auto`}>
          <div>{rateAP.concat(...[" ", isInLendingMode ? "APY" : "APR"])}</div>
        </div>
      </div>
      <AssetCardStats
        bank={bank}
        assetWeight={assetWeight}
        totalDepositsOrBorrows={totalDepositsOrBorrows}
        userBalance={userBalance}
        isInLendingMode={isInLendingMode}
        isBankFilled={isBankFilled}
        isBankHigh={isBankHigh}
        bankFilled={bankFilled}
      ></AssetCardStats>
    </div>
  );
};

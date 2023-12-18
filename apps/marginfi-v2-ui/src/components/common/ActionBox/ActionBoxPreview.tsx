import React, { FC } from "react";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import Image from "next/image";

import { useMrgnlendStore } from "~/store";
import { clampedNumeralFormatter, cn, getLiquidationPriceColor, getMaintHealthColor } from "~/utils";
import { IconArrowRight } from "~/components/ui/icons";
import { Badge, Typography } from "@mui/material";
import { MrgnTooltip } from "../MrgnTooltip";
import { REDUCE_ONLY_BANKS } from "~/components/desktop/AssetsList/AssetRow";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { ActionPreview } from "./ActionBox";
import { Skeleton } from "~/components/ui/skeleton";

interface ActionBoxPreviewProps {
  marginfiAccount: MarginfiAccountWrapper | null;
  selectedBank: ExtendedBankInfo;
  actionMode: ActionType;
  isLoading: boolean;
  preview: ActionPreview | null;
}

export const ActionBoxPreview: FC<ActionBoxPreviewProps> = ({ marginfiAccount, selectedBank, actionMode, isLoading, preview }) => {
  const showLending = React.useMemo(
    () => actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw,
    [actionMode]
  );

  const { isBankFilled, isBankHigh, bankCap } = useAssetItemData({
    bank: selectedBank,
    isInLendingMode: showLending,
  });

  const [accountSummary] = useMrgnlendStore((state) => [state.accountSummary]);

  const isReduceOnly = React.useMemo(
    () => (selectedBank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(selectedBank?.meta.tokenSymbol) : false),
    [selectedBank]
  );

  const isBorrowing = marginfiAccount?.activeBalances.find((b) => b.active && b.liabilityShares.gt(0)) !== undefined;

  const currentPositionAmount = selectedBank.isActive ? selectedBank.position.amount : 0;
  const liquidationPriceColor =
    preview && preview.liquidationPrice
      ? getLiquidationPriceColor(selectedBank.info.oraclePrice.price.toNumber(), preview.liquidationPrice)
      : "white";

  return (
    <dl className="grid grid-cols-2 h-40 gap-y-2 pt-6 text-muted-foreground text-sm">
      <Stat classNames="text-[white]" label={`Your ${showLending ? "deposited" : "borrowed"} amount`}>
        {clampedNumeralFormatter(currentPositionAmount)}
        {preview && <IconArrowRight width={12} height={12} />}
        {preview && clampedNumeralFormatter(preview.positionAmount)}
      </Stat>
      <Stat classNames="text-[white]" label={"Pool"}>
        {selectedBank.info.state.isIsolated ? (
          <>
            Isolated pool{" "}
            <MrgnTooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                    Isolated pools are risky ⚠️
                  </Typography>
                  Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you cannot
                  borrow other assets. Isolated pools should be considered particularly risky. As always, remember that
                  marginfi is a decentralized protocol and all deposited funds are at risk.
                </React.Fragment>
              }
              placement="top"
            >
              <Image src="/info_icon.png" alt="info" height={12} width={12} />
            </MrgnTooltip>{" "}
          </>
        ) : (
          <>Global pool</>
        )}
      </Stat>

      <Stat classNames={`text-[${getMaintHealthColor(accountSummary.healthFactor)}]`} label="Health">
        {accountSummary.healthFactor && percentFormatter.format(accountSummary.healthFactor)}
        {accountSummary.healthFactor && <IconArrowRight width={12} height={12} />}
        {isLoading ? <Skeleton className="h-4 w-[45px]" /> : (preview?.health ? percentFormatter.format(preview.health) : "-")}
      </Stat>
      {(actionMode === ActionType.Borrow || isBorrowing) && (
        <Stat classNames={`text-[${liquidationPriceColor}]`} label="Liquidation price">
          {selectedBank.isActive &&
            selectedBank.position.liquidationPrice &&
            selectedBank.position.liquidationPrice > 0.01 &&
            numeralFormatter(selectedBank.position.liquidationPrice)}
          {selectedBank.isActive && selectedBank.position.liquidationPrice && <IconArrowRight width={12} height={12} />}
          {isLoading ? <Skeleton className="h-4 w-[45px]" /> : (preview?.liquidationPrice ? numeralFormatter(preview.liquidationPrice) : "-")}
        </Stat>
      )}
      <Stat classNames="text-[white]" label={showLending ? "Global deposits" : "Available"}>
        <MrgnTooltip
          title={
            <React.Fragment>
              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                {isReduceOnly ? "Reduce Only" : isBankHigh && (isBankFilled ? "Limit Reached" : "Approaching Limit")}
              </Typography>

              {isReduceOnly
                ? "stSOL is being discontinued."
                : `${selectedBank.meta.tokenSymbol} ${showLending ? "deposits" : "borrows"
                } are at ${percentFormatter.format(
                  (showLending ? selectedBank.info.state.totalDeposits : selectedBank.info.state.totalBorrows) /
                  bankCap
                )} capacity.`}
              <br />
              <a href="https://docs.marginfi.com">
                <u>Learn more.</u>
              </a>
            </React.Fragment>
          }
          placement="right"
          className={``}
        >
          <Badge
            badgeContent={isReduceOnly ? "‼️" : isBankHigh && isBankFilled ? "💯" : "❗"}
            className="bg-transparent"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 20,
              },
            }}
            invisible={!isBankHigh && !isReduceOnly}
          >
            {numeralFormatter(
              showLending
                ? selectedBank.info.state.totalDeposits
                : Math.max(
                  0,
                  Math.min(
                    selectedBank.info.state.totalDeposits,
                    selectedBank.info.rawBank.config.borrowLimit.toNumber()
                  ) - selectedBank.info.state.totalBorrows
                )
            )}
          </Badge>
        </MrgnTooltip>
      </Stat>
    </dl>
  );
};

interface StatProps {
  label: string;
  classNames?: string;
  children: React.ReactNode;
}
const Stat = ({ label, classNames, children }: StatProps) => {
  return (
    <>
      <dt>{label}</dt>
      <dd className={cn(`${classNames} flex justify-end font-medium text-right items-center gap-2`)}>{children}</dd>
    </>
  );
};

import React, { FC } from "react";
import { getPriceWithConfidence, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import Image from "next/image";

import { useMrgnlendStore } from "~/store";
import { clampedNumeralFormatter, cn, getLiquidationPriceColor, getMaintHealthColor } from "~/utils";
import { IconArrowRight, IconAlertTriangle, IconAlertTriangleFilled } from "~/components/ui/icons";
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

export const ActionBoxPreview: FC<ActionBoxPreviewProps> = ({
  marginfiAccount,
  selectedBank,
  actionMode,
  isLoading,
  preview,
}) => {
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

  const isLending = marginfiAccount?.activeBalances.find((b) => b.active) !== undefined;

  const currentPositionAmount = selectedBank.isActive ? selectedBank.position.amount : 0;

  const price = getPriceWithConfidence(selectedBank.info.oraclePrice, false).price.toNumber();

  const liquidationColor = React.useMemo(
    () => (preview && preview.liquidationPrice ? getMaintHealthColor(preview.liquidationPrice / price) : ""),
    [preview, selectedBank]
  );
  const healthColor = React.useMemo(
    () => getMaintHealthColor(preview?.health ?? accountSummary.healthFactor),
    [preview?.health, accountSummary.healthFactor]
  );

  return (
    <dl className="grid grid-cols-2 h-40 gap-y-2 pt-6 text-sm text-white">
      <Stat label={`Your ${showLending ? "deposited" : "borrowed"} amount`}>
        {clampedNumeralFormatter(currentPositionAmount)} {selectedBank.meta.tokenSymbol}
        {preview && <IconArrowRight width={12} height={12} />}
        {preview &&
          preview.positionAmount &&
          clampedNumeralFormatter(preview.positionAmount) + " " + selectedBank.meta.tokenSymbol}
      </Stat>
      <Stat label={"Pool"}>
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

      <Stat style={{ color: healthColor }} label="Health">
        {accountSummary.healthFactor && percentFormatter.format(accountSummary.healthFactor)}
        {accountSummary.healthFactor && preview?.health ? <IconArrowRight width={12} height={12} /> : ""}
        {isLoading ? (
          <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
        ) : preview?.health ? (
          percentFormatter.format(preview.health)
        ) : (
          ""
        )}
      </Stat>
      {(actionMode === ActionType.Borrow || isBorrowing) && (
        <Stat style={{ color: liquidationColor }} label="Liquidation price">
          {selectedBank.isActive &&
            selectedBank.position.liquidationPrice &&
            selectedBank.position.liquidationPrice > 0.01 &&
            usdFormatter.format(selectedBank.position.liquidationPrice)}
          {selectedBank.isActive && selectedBank.position.liquidationPrice && preview?.liquidationPrice && (
            <IconArrowRight width={12} height={12} />
          )}
          {isLoading ? (
            <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
          ) : preview?.liquidationPrice ? (
            usdFormatter.format(preview.liquidationPrice)
          ) : (
            ""
          )}
        </Stat>
      )}
      <Stat label={showLending ? "Global deposits" : "Available"}>
        <MrgnTooltip
          title={
            <React.Fragment>
              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                {isReduceOnly ? "Reduce Only" : isBankHigh && (isBankFilled ? "Limit Reached" : "Approaching Limit")}
              </Typography>

              {isReduceOnly
                ? "stSOL is being discontinued."
                : `${selectedBank.meta.tokenSymbol} ${
                    showLending ? "deposits" : "borrows"
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
          <span
            className={cn(
              "flex items-center justify-end gap-1.5 text-white",
              (isReduceOnly || isBankHigh) && "text-warning",
              isBankFilled && "text-destructive-foreground"
            )}
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

            {isReduceOnly || (isBankHigh && !isBankFilled) ? (
              <IconAlertTriangle size={16} />
            ) : isBankFilled ? (
              <IconAlertTriangleFilled size={16} />
            ) : null}
          </span>
        </MrgnTooltip>
      </Stat>
    </dl>
  );
};

interface StatProps {
  label: string;
  classNames?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
const Stat = ({ label, classNames, children, style }: StatProps) => {
  return (
    <>
      <dt className="text-muted-foreground font-normal">{label}</dt>
      <dd className={cn("flex justify-end text-right items-center gap-2", classNames)} style={style}>
        {children}
      </dd>
    </>
  );
};

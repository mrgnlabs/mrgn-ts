import React, { FC } from "react";
import { MarginRequirementType, MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import Image from "next/image";

import { useMrgnlendStore } from "~/store";
import { cn, isWholePosition } from "~/utils";
import { IconArrowRight, IconInfoCircle, IconWallet } from "~/components/ui/icons";
import { Badge, Typography } from "@mui/material";
import { MrgnTooltip } from "../MrgnTooltip";
import { REDUCE_ONLY_BANKS } from "~/components/desktop/AssetsList/AssetRow";
import { useAssetItemData } from "~/hooks/useAssetItemData";

interface ActionPreview {
  health: number;
  liquidationPrice: number | null;
  depositRate: number;
  borrowRate: number;
} // TODO: to extend with any other fields we want to display

interface ActionBoxPreviewProps {
  marginfiAccount: MarginfiAccountWrapper | null;
  selectedBank: ExtendedBankInfo;
  actionAmount: number | null;
  actionMode: ActionType;
}

export const ActionBoxPreview: FC<ActionBoxPreviewProps> = ({
  marginfiAccount,
  selectedBank,
  actionAmount,
  actionMode,
}) => {
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const showLending = React.useMemo(
    () => actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw,
    [actionMode]
  );

  const { isBankFilled, isBankHigh, bankCap } = useAssetItemData({
    bank: selectedBank,
    isInLendingMode: showLending,
  });

  const [accountSummary] = useMrgnlendStore((state) => [state.accountSummary]);

  const healthColorLiquidation = React.useMemo(() => {
    const isActive = selectedBank?.isActive;
    if (isActive && preview?.liquidationPrice) {
      const price = selectedBank.info.oraclePrice.price.toNumber();
      const safety = preview.liquidationPrice / price;
      let color: string;
      if (safety >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (safety >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [selectedBank, preview]);

  const healthColor = React.useMemo(() => {
    if (preview?.health) {
      let color: string;

      if (preview?.health >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (preview?.health >= 0.25) {
        color = "#b8b45f"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [selectedBank, preview]);

  const isReduceOnly = React.useMemo(
    () => (selectedBank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(selectedBank?.meta.tokenSymbol) : false),
    [selectedBank]
  );

  React.useEffect(() => {
    const computePreview = async () => {
      if (!marginfiAccount || !selectedBank || !actionAmount) {
        return;
      }

      try {
        let simulationResult: SimulationResult;

        if (actionMode === ActionType.Deposit) {
          simulationResult = await marginfiAccount.simulateDeposit(actionAmount, selectedBank.address);
        } else if (actionMode === ActionType.Withdraw) {
          simulationResult = await marginfiAccount.simulateWithdraw(
            actionAmount,
            selectedBank.address,
            selectedBank.isActive && isWholePosition(selectedBank, actionAmount)
          );
        } else if (actionMode === ActionType.Borrow) {
          simulationResult = await marginfiAccount.simulateBorrow(actionAmount, selectedBank.address);
        } else if (actionMode === ActionType.Repay) {
          simulationResult = await marginfiAccount.simulateRepay(
            actionAmount,
            selectedBank.address,
            selectedBank.isActive && isWholePosition(selectedBank, actionAmount)
          );
        } else {
          throw new Error("Unknown action mode");
        }

        const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
          MarginRequirementType.Maintenance
        );
        const health = assets.minus(liabilities).dividedBy(assets).toNumber();

        const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(selectedBank.address);

        const { lendingRate, borrowingRate } = simulationResult.banks
          .get(selectedBank.address.toBase58())!
          .computeInterestRates();
        setPreview({
          health,
          liquidationPrice,
          depositRate: lendingRate.toNumber(),
          borrowRate: borrowingRate.toNumber(),
        });
      } catch (error) {
        setPreview(null);
        console.log("Error computing action preview", error);
      }
    };

    // TODO 1: debounce that call on actionAmount change
    // TODO 2: this effect seems to be called periodically (more frequently than full state refetch it seems)
    computePreview();
  }, [actionAmount, actionMode, marginfiAccount, selectedBank]);

  const isBorrowing = marginfiAccount?.activeBalances.find((b) => b.active && b.liabilityShares.gt(0)) !== undefined;

  if (!selectedBank || !marginfiAccount || !actionAmount) {
    return null;
  }

  return (
    <dl className="grid grid-cols-2 text-muted-foreground gap-y-2 mt-4 text-sm">
      <>
        <dt>{`Your ${showLending ? "deposited" : "borrowed"} amount`}</dt>
        <dd className={cn(`text-[white] font-medium text-right`)}>
          {selectedBank.isActive
            ? (showLending ? selectedBank?.position?.isLending : !selectedBank?.position?.isLending)
              ? selectedBank?.position?.amount < 0.01
                ? "< $0.01"
                : numeralFormatter(selectedBank?.position?.amount ?? 0)
              : 0
            : 0}
        </dd>
      </>
      <>
        <dt>Pool</dt>
        <dd className={cn(`text-[white] flex justify-end font-medium text-right items-center gap-2`)}>
          {selectedBank?.info?.state?.isIsolated ? (
            <>
              Isolated pool{" "}
              <MrgnTooltip
                title={
                  <React.Fragment>
                    <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                      Isolated pools are risky ⚠️
                    </Typography>
                    Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you cannot
                    borrow other assets. Isolated pools should be considered particularly risky. As always, remember
                    that marginfi is a decentralized protocol and all deposited funds are at risk.
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
        </dd>
      </>
      <>
        <dt>Health</dt>
        <dd className={cn(`text-[${healthColor}] flex justify-end font-medium text-right items-center gap-2`)}>
          {accountSummary?.healthFactor && percentFormatter.format(accountSummary?.healthFactor)}
          {accountSummary?.healthFactor && <IconArrowRight width={12} height={12} />}
          {preview?.health ? percentFormatter.format(preview.health) : "-"}
        </dd>
      </>
      {(actionMode === ActionType.Borrow || isBorrowing) && (
        <>
          <dt className="flex gap-2">
            Liquidation price <IconInfoCircle size={16} />
          </dt>
          <dd
            className={cn(
              `text-[${healthColorLiquidation}] flex justify-end font-medium text-right items-center gap-2`
            )}
          >
            {selectedBank.isActive &&
              selectedBank?.position?.liquidationPrice &&
              selectedBank.position.liquidationPrice > 0.01 &&
              numeralFormatter(selectedBank.position.liquidationPrice)}
            {selectedBank.isActive && selectedBank?.position?.liquidationPrice && (
              <IconArrowRight width={12} height={12} />
            )}
            {preview?.liquidationPrice ? numeralFormatter(preview.liquidationPrice) : "-"}
          </dd>
        </>
      )}
      {actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw ? (
        <>
          <dt>Deposit rate</dt>
          <dd className={cn(`text-[white] font-medium text-right`)}>
            {preview?.depositRate ? percentFormatter.format(preview.depositRate) : "-"}
          </dd>
        </>
      ) : (
        <>
          <dt>Borrow rate</dt>
          <dd className={cn(`text-[white] font-medium text-right`)}>
            {preview?.borrowRate ? percentFormatter.format(preview.borrowRate) : "-"}
          </dd>
        </>
      )}
      <>
        <dt>{showLending ? "Deposits" : "Available"}</dt>
        <dd className={cn(`text-[white] flex justify-end font-medium text-right items-center gap-2`)}>
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
        </dd>
      </>
    </dl>
  );
};

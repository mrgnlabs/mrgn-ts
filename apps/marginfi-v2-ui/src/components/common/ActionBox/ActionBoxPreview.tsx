import React, { FC } from "react";
import { MarginRequirementType, MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, numeralFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import Image from "next/image";

import { useMrgnlendStore } from "~/store";
import { cn, isWholePosition } from "~/utils";
import { IconArrowRight, IconInfoCircle, IconWallet } from "~/components/ui/icons";
import { Badge, Typography } from "@mui/material";
import { MrgnTooltip } from "../MrgnTooltip";
import { REDUCE_ONLY_BANKS } from "~/components/desktop/AssetsList/AssetRow";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { ActionMethod } from "./ActionBox.utils";
import { ActionBoxActions } from "./ActionBoxActions";

interface ActionPreview {
  health: number;
  liquidationPrice: number | null;
  depositRate: number;
  borrowRate: number;
  positionAmount: number;
  availableCollateral: {
    ratio: number;
    amount: number;
  };
}

interface ActionBoxPreviewProps {
  marginfiAccount: MarginfiAccountWrapper | null;
  selectedBank: ExtendedBankInfo;
  actionAmount: number | null;
  actionMode: ActionType;
  isLoading: boolean;
  actionMethod: ActionMethod;
  handleAction: () => void;
}

export const ActionBoxPreview: FC<ActionBoxPreviewProps> = ({
  marginfiAccount,
  selectedBank,
  actionAmount,
  actionMode,
  isLoading,
  actionMethod,
  handleAction,
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
        const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
          MarginRequirementType.Maintenance
        );
        const health = assets.minus(liabilities).dividedBy(assets).toNumber();

        const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(selectedBank.address);

        const { lendingRate, borrowingRate } = simulationResult.banks
          .get(selectedBank.address.toBase58())!
          .computeInterestRates();

        const position = simulationResult.marginfiAccount.activeBalances.find(
          (b) => b.active && b.bankPk.equals(selectedBank.address)
        );
        let positionAmount = 0;
        if (position?.active && position?.liabilityShares.gt(0)) {
          positionAmount = position.computeQuantityUi(selectedBank.info.rawBank).liabilities.toNumber();
        } else if (position?.active && position?.assetShares.gt(0)) {
          positionAmount = position.computeQuantityUi(selectedBank.info.rawBank).assets.toNumber();
        }
        const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();

        setPreview({
          health,
          liquidationPrice,
          depositRate: lendingRate.toNumber(),
          borrowRate: borrowingRate.toNumber(),
          positionAmount,
          availableCollateral: {
            amount: availableCollateral,
            ratio: availableCollateral / assetsInit.toNumber(),
          },
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
    return <ActionBoxActions handleAction={() => handleAction()} isLoading={isLoading} actionMethod={actionMethod} />;
  }

  const currentPositionAmount = selectedBank.isActive ? selectedBank.position.amount : 0;
  const currentAvailableCollateralAmount = marginfiAccount.computeFreeCollateral().toNumber();
  const currentAvailableCollateralRatio =
    currentAvailableCollateralAmount /
    marginfiAccount.computeHealthComponents(MarginRequirementType.Initial).assets.toNumber();

  return (
    <>
      <div className="pb-6">
        <dl className="flex justify-between items-center text-muted-foreground  gap-2">
          <dt className="flex items-center gap-1.5 text-sm pb-2">
            Available collateral
            <MrgnTooltip
              title={
                <React.Fragment>
                  <div className="flex flex-col gap-2 pb-2">
                    <p>Available collateral is the USD value of your collateral not actively backing a loan.</p>
                    <p>It can be used to open additional borrows or withdraw part of your collateral.</p>
                  </div>
                </React.Fragment>
              }
              placement="top"
            >
              <IconInfoCircle size={16} />
            </MrgnTooltip>
          </dt>
          <dd className="text-xl md:text-sm font-bold" style={{ color: healthColor }}>
            {usdFormatterDyn.format(preview?.availableCollateral.amount ?? currentAvailableCollateralAmount)}
          </dd>
        </dl>
        <div className="h-2 mb-2 bg-background-gray-light">
          <div
            className="h-2"
            style={{
              backgroundColor: healthColor,
              width: `${(preview?.availableCollateral.ratio ?? currentAvailableCollateralRatio) * 100}%`,
            }}
          />
        </div>
      </div>
      <ActionBoxActions handleAction={() => handleAction()} isLoading={isLoading} actionMethod={actionMethod} />

      <dl className="grid grid-cols-2 gap-y-2 pt-6 text-muted-foreground text-sm">
        <Stat classNames="text-[white]" label={`Your ${showLending ? "deposited" : "borrowed"} amount`}>
          {currentPositionAmount < 0.01
            ? currentPositionAmount === 0
              ? 0
              : "< $0.01"
            : numeralFormatter(currentPositionAmount)}
          {preview && <IconArrowRight width={12} height={12} />}
          {preview && numeralFormatter(preview.positionAmount)}
        </Stat>
        <Stat classNames="text-[white]" label={"Pool"}>
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
        </Stat>

        <Stat classNames={`text-[${healthColor}]`} label="Health">
          {accountSummary?.healthFactor && percentFormatter.format(accountSummary?.healthFactor)}
          {accountSummary?.healthFactor && <IconArrowRight width={12} height={12} />}
          {preview?.health ? percentFormatter.format(preview.health) : "-"}
        </Stat>
        {(actionMode === ActionType.Borrow || isBorrowing) && (
          <Stat classNames={`text-[${healthColorLiquidation}]`} label="Liquidation price">
            {selectedBank.isActive &&
              selectedBank?.position?.liquidationPrice &&
              selectedBank.position.liquidationPrice > 0.01 &&
              numeralFormatter(selectedBank.position.liquidationPrice)}
            {selectedBank.isActive && selectedBank?.position?.liquidationPrice && (
              <IconArrowRight width={12} height={12} />
            )}
            {preview?.liquidationPrice ? numeralFormatter(preview.liquidationPrice) : "-"}
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
        </Stat>
      </dl>
    </>
  );
};

interface StatProps {
  label: string;
  tooltip?: string;
  classNames?: string;
  children: React.ReactNode;
}
const Stat = ({ label, tooltip, classNames, children }: StatProps) => {
  return (
    <>
      <dt>{label}</dt>
      <dd className={cn(`${classNames} flex justify-end font-medium text-right items-center gap-2`)}>{children}</dd>
    </>
  );
};

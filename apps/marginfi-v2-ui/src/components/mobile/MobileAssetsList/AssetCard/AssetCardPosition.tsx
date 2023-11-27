import React from "react";

import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";

import { MrgnTooltip } from "~/components/common";

import { IconAlertTriangle } from "~/components/ui/icons";

import { cn } from "~/utils";

type AssetCardPositionProps = {
  activeBank: ActiveBankInfo;
};

export const AssetCardPosition = ({ activeBank }: AssetCardPositionProps) => {
  const [lendingMode, isFilteredUserPositions] = useUiStore((state) => [
    state.lendingMode,
    state.isFilteredUserPositions,
  ]);

  const isUserPositionPoorHealth = React.useMemo(() => {
    if (!activeBank || !activeBank.position.liquidationPrice) {
      return false;
    }

    const alertRange = 0.2;

    if (activeBank.position.isLending) {
      return (
        activeBank.info.state.price <
        activeBank.position.liquidationPrice + activeBank.position.liquidationPrice * alertRange
      );
    } else {
      return (
        activeBank.info.state.price >
        activeBank.position.liquidationPrice - activeBank.position.liquidationPrice * alertRange
      );
    }
  }, [activeBank]);

  return (
    <div className={cn("bg-accent p-3.5 rounded-lg text-sm", isUserPositionPoorHealth && "bg-destructive")}>
      <h3>
        Your {isFilteredUserPositions ? (activeBank.position.isLending ? "lending " : "borrowing ") : ""} position
        details
      </h3>
      <dl className="grid grid-cols-2 text-accent-foreground mt-2 w-full space-y-1">
        <dt>{activeBank.position.isLending ? "Lending" : "Borrowing"}</dt>
        <dd className="text-white font-medium text-right">
          {activeBank.position.amount < 0.01 && "< "}
          {numeralFormatter(activeBank.position.amount) + " " + activeBank.meta.tokenSymbol}
        </dd>
        <dt>USD Value</dt>
        <dd className="text-white font-medium text-right">{usdFormatter.format(activeBank.position.usdValue)}</dd>
        {activeBank.position.liquidationPrice && activeBank.position.liquidationPrice > 0 && (
          <>
            <dt
              className={cn(
                "mr-1.5 flex items-center gap-1.5",
                isUserPositionPoorHealth && "text-destructive-foreground"
              )}
            >
              {isUserPositionPoorHealth && (
                <MrgnTooltip title="Your account is at risk of liquidation" placement="left">
                  <IconAlertTriangle size={16} />
                </MrgnTooltip>
              )}
              Liquidation price
            </dt>
            <dd className="text-white font-medium text-right">
              {activeBank.position.liquidationPrice > 0.01
                ? usdFormatter.format(activeBank.position.liquidationPrice)
                : `$${activeBank.position.liquidationPrice.toExponential(2)}`}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
};

import React from "react";

import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { cn } from "~/utils";

type AssetCardPositionProps = {
  activeBank: ActiveBankInfo;
  userPosition?: ActiveBankInfo;
};

export const AssetCardPosition = ({ activeBank, userPosition }: AssetCardPositionProps) => {
  const isUserPositionPoorHealth = React.useMemo(() => {
    if (!activeBank.position.amount || !activeBank.position.liquidationPrice) {
      return false;
    }

    return activeBank.info.state.price < activeBank.position.liquidationPrice * (1 + 0.05);
  }, [userPosition]);

  return (
    <div className={cn("bg-accent p-3.5 rounded-lg text-sm", isUserPositionPoorHealth && "bg-destructive")}>
      <h3>Your position details</h3>
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
            <dt>Liquidation price</dt>
            <dd className="text-white font-medium text-right">
              {usdFormatter.format(activeBank.position.liquidationPrice)}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
};

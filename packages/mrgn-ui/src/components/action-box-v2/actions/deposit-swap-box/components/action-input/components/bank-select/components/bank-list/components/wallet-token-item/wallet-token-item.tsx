import React from "react";

import { usdFormatter, WalletToken } from "@mrgnlabs/mrgn-common";
import { cn, LendingModes } from "@mrgnlabs/mrgn-utils";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

type WalletTokenItemProps = {
  token: WalletToken;
  showBalanceOverride: boolean;
  nativeSolBalance?: number;
  lendingMode?: LendingModes;
  isRepay?: boolean;
  available?: boolean;
};

export const WalletTokenItem = ({
  token,
  showBalanceOverride,
  lendingMode,
  isRepay,
  available = true,
}: WalletTokenItemProps) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const balance = React.useMemo(() => {
    return token.balance;
  }, [token]);

  const balancePrice = React.useMemo(
    () =>
      balance * token.price > 0.000001
        ? usdFormatter.format(balance * token.price)
        : `$${(balance * token.price).toExponential(2)}`,
    [token, balance]
  );

  return (
    <>
      <div className="flex items-center gap-3">
        <div
          className={cn("w-[28px] h-[28px] rounded-full bg-mfi-action-box-accent", !imageLoaded && "animate-pulsate")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={token.logoUri}
            alt={token.name}
            width={28}
            height={28}
            className={cn("rounded-full w-[28px] h-[28px] object-cover opacity-0", imageLoaded && "opacity-100")}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <div>
          <p className="flex items-center">
            {token.symbol}
            {!available && <span className="text-[11px] ml-1 font-light">(currently unavailable)</span>}
          </p>
        </div>
      </div>

      {((!isRepay && lendingMode && lendingMode === LendingModes.BORROW && balance > 0) || showBalanceOverride) && (
        <div className="space-y-0.5 text-right font-normal text-sm">
          <p>{dynamicNumeralFormatter(balance, { tokenPrice: token.price })}</p>
          <p className="text-xs text-muted-foreground">{balancePrice}</p>
        </div>
      )}
    </>
  );
};

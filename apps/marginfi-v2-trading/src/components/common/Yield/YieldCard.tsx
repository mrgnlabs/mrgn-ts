import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter, USDC_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useTradeStore } from "~/store";
import { ArenaBank, GroupData } from "~/store/tradeStore";
import { getTokenImageURL, cn, getGroupPositionInfo, capture } from "~/utils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface YieldCardProps {
  group: GroupData;
}

export const YieldCard = ({ group }: YieldCardProps) => {
  const [portfolio] = useTradeStore((state) => [state.portfolio]);
  const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);
  const isLeveraged = React.useMemo(() => positionInfo === "LONG" || positionInfo === "SHORT", [positionInfo]);

  const collateralBank = group.pool.quoteTokens[0];

  const isLPPosition = React.useCallback(
    (bank: ArenaBank) => {
      if (!portfolio) return false;
      return portfolio.lpPositions.some((group) => group.groupPk.equals(bank.info.rawBank.group));
    },
    [portfolio]
  );

  return (
    <div
      key={group.client.group.address.toBase58()}
      className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4"
    >
      <Link
        href={`/trade/${group.client.group.address.toBase58()}`}
        className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
      >
        <div className="flex items-center -space-x-2.5">
          <Image
            src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
            alt={group.pool.token.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full bg-background z-10"
          />
          <Image
            src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
            alt={collateralBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
        </div>
        <span>
          {group.pool.token.meta.tokenSymbol}/{collateralBank.meta.tokenSymbol}
        </span>
        <div className="flex items-center gap-1 text-mrgn-green">
          <span>Trade</span>
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
      <YieldItem
        group={group}
        bank={group.pool.token}
        isLeveraged={isLeveraged}
        isLPPosition={isLPPosition(group.pool.token)}
        className="pt-2 pb-4 border-b items-center"
      />
      <YieldItem
        group={group}
        bank={collateralBank}
        isLeveraged={isLeveraged}
        isLPPosition={isLPPosition(collateralBank)}
        className="pt-4 pb-2 items-center"
      />
    </div>
  );
};

const YieldItem = ({
  group,
  bank,
  className,
  isLeveraged,
  isLPPosition,
}: {
  group: GroupData;
  bank: ArenaBank;
  className?: string;
  isLeveraged?: boolean;
  isLPPosition?: boolean;
}) => {
  return (
    <div className={cn("items-center", className)}>
      <div className="flex items-center gap-2">
        <Image
          src={getTokenImageURL(bank.info.state.mint.toBase58())}
          alt={bank.meta.tokenSymbol}
          width={24}
          height={24}
          className="rounded-full"
        />
        {bank.meta.tokenSymbol}
      </div>
      <div className="grid grid-cols-2 gap-2 my-6">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Total Deposits</span>
          <span>
            {usdFormatter.format(bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Lending Rate (APY)</span>
          <span className="text-mrgn-success">{percentFormatter.format(aprToApy(bank.info.state.lendingRate))}</span>
        </div>
      </div>
      {bank.isActive && bank.position.isLending && isLPPosition && (
        <div className="text-sm mb-4">
          <span className="text-muted-foreground">Supplied</span>{" "}
          {usdFormatter.format(bank.position.amount * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          {!bank.info.state.mint.equals(USDC_MINT) && (
            <span className="uppercase ml-1 text-muted-foreground">
              ({numeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol})
            </span>
          )}
        </div>
      )}
      <TooltipProvider>
        <div className="flex flex-col gap-2 md:flex-row">
          {bank.isActive && !isLeveraged && bank.position.isLending && group.selectedAccount && (
            <ActionBoxDialog activeGroupArg={group} requestedBank={bank} requestedAction={ActionType.Withdraw}>
              <Button
                className="w-full bg-background border text-foreground hover:bg-accent"
                onClick={() => {
                  capture("yield_withdraw_btn_click", {
                    group: group.client.group.address.toBase58(),
                    bank: bank.meta.tokenSymbol,
                  });
                }}
              >
                Withdraw {bank.meta.tokenSymbol}
              </Button>
            </ActionBoxDialog>
          )}
          <ActionBoxDialog activeGroupArg={group} requestedBank={group.pool.token} requestedAction={ActionType.Deposit}>
            {isLeveraged ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  You cannot provide liquidity with an open trade.{" "}
                  <Link
                    className="underline"
                    href={"https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"}
                    target="_blank"
                  >
                    learn more
                  </Link>
                </p>
                <Button disabled className="w-full bg-background border text-foreground hover:bg-accent">
                  Supply {bank.meta.tokenSymbol}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-background border text-foreground hover:bg-accent"
                onClick={() => {
                  capture("yield_supply_btn_click", {
                    group: group.client.group.address.toBase58(),
                    bank: bank.meta.tokenSymbol,
                  });
                }}
              >
                Supply {bank.meta.tokenSymbol}
              </Button>
            )}
          </ActionBoxDialog>
        </div>
      </TooltipProvider>
    </div>
  );
};

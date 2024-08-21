import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ArenaBank, GroupData } from "~/store/tradeStore";
import { getTokenImageURL, cn, getGroupPositionInfo, capture } from "~/utils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface YieldCardProps {
  group: GroupData;
}

export const YieldCard = ({ group }: YieldCardProps) => {
  const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);
  const isLeveraged = React.useMemo(() => positionInfo === "LONG" || positionInfo === "SHORT", [positionInfo]);

  const collateralBank = group.pool.quoteTokens[0];

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
        className="pt-2 pb-4 border-b items-center"
      />
      <YieldItem group={group} bank={collateralBank} isLeveraged={isLeveraged} className="pt-4 pb-2 items-center" />
    </div>
  );
};

const YieldItem = ({
  group,
  bank,
  className,
  isLeveraged,
}: {
  group: GroupData;
  bank: ArenaBank;
  className?: string;
  isLeveraged?: boolean;
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
      <div className="grid grid-cols-3 gap-2 my-6">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            Total
            <br /> Deposits
          </span>
          <div className="flex flex-col">
            <span>{numeralFormatter(bank.info.state.totalDeposits)}</span>
            <span className="text-muted-foreground text-sm">
              {usdFormatter.format(
                bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            Lending
            <br /> Rate (APY)
          </span>
          <span className="text-mrgn-success">{percentFormatter.format(aprToApy(bank.info.state.lendingRate))}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            Borrowing
            <br /> Rate (APY)
          </span>
          <span className="text-mrgn-warning">{percentFormatter.format(aprToApy(bank.info.state.borrowingRate))}</span>
        </div>
      </div>
      {bank.isActive && bank.position.isLending && (
        <div className="text-sm mb-4">
          <span className="text-muted-foreground">Supplied</span> {numeralFormatter(bank.position.amount)}{" "}
          <span>{bank.meta.tokenSymbol}</span>
        </div>
      )}
      <TooltipProvider>
        <div className="flex flex-col gap-2 md:flex-row">
          {bank.isActive && isLeveraged && bank.position.isLending && (
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
                Withdraw
              </Button>
            </ActionBoxDialog>
          )}
          <ActionBoxDialog activeGroupArg={group} requestedBank={group.pool.token} requestedAction={ActionType.Deposit}>
            {isLeveraged ? (
              <Tooltip>
                <TooltipTrigger className="cursor-default" asChild>
                  <Button disabled className="w-full bg-background border text-foreground hover:bg-accent">
                    Supply {bank.meta.tokenSymbol}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  You cannot provide liquidity with an open trade. <br />
                  <Link
                    className="underline"
                    href={"https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"}
                    target="_blank"
                  >
                    learn more
                  </Link>
                </TooltipContent>
              </Tooltip>
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

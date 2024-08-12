import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { GroupData } from "~/store/tradeStore";
import { getTokenImageURL, cn } from "~/utils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

interface YieldCardProps {
  group: GroupData;
}

export const YieldCard = ({ group }: YieldCardProps) => {
  const collateralBank = group.pool.quoteTokens[0];
  // const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);

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
      <div className="pt-2 pb-4 border-b items-center">
        <div className="flex items-center gap-2">
          <Image
            src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
            alt={group.pool.token.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
          {group.pool.token.meta.tokenSymbol}
        </div>
        <div className="grid grid-cols-3 gap-2 my-6">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">
              Total
              <br /> Deposits
            </span>
            <div className="flex flex-col">
              <span>{numeralFormatter(group.pool.token.info.state.totalDeposits)}</span>
              <span className="text-muted-foreground text-sm">
                {usdFormatter.format(
                  group.pool.token.info.state.totalDeposits *
                    group.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">
              Lending
              <br /> Rate (APY)
            </span>
            <span className="text-mrgn-success">
              {percentFormatter.format(aprToApy(group.pool.token.info.state.lendingRate))}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">
              Borrowing
              <br /> Rate (APY)
            </span>
            <span className="text-mrgn-warning">
              {percentFormatter.format(aprToApy(group.pool.token.info.state.borrowingRate))}
            </span>
          </div>
        </div>
        {group.pool.token.isActive && group.pool.token.position.isLending && (
          <div className="text-sm mb-4">
            <span className="text-muted-foreground">Supplied</span> {numeralFormatter(group.pool.token.position.amount)}{" "}
            <span>{group.pool.token.meta.tokenSymbol}</span>
          </div>
        )}
        <div className="flex gap-2">
          {group.pool.token.isActive && group.pool.token.position.isLending && (
            <ActionBoxDialog
              activeGroupArg={group}
              requestedBank={group.pool.token}
              requestedAction={ActionType.Withdraw}
            >
              <Button className="w-full bg-background border text-foreground hover:bg-accent">Withdraw</Button>
            </ActionBoxDialog>
          )}
          <ActionBoxDialog activeGroupArg={group} requestedBank={group.pool.token} requestedAction={ActionType.Deposit}>
            <Button className="w-full bg-background border text-foreground hover:bg-accent">Supply</Button>
          </ActionBoxDialog>
        </div>
      </div>
      <div className="pt-4 pb-2 items-center">
        <div className="flex items-center gap-2">
          <Image
            src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
            alt={collateralBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
          {collateralBank.meta.tokenSymbol}
        </div>
        <div className="grid grid-cols-3 gap-2 my-6">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">
              Total
              <br /> Deposits
            </span>
            <div className="flex flex-col">
              <span>{numeralFormatter(collateralBank.info.state.totalDeposits)}</span>
              <span className="text-muted-foreground text-sm">
                {usdFormatter.format(
                  collateralBank.info.state.totalDeposits *
                    collateralBank.info.oraclePrice.priceRealtime.price.toNumber()
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">
              Lending
              <br /> Rate (APY)
            </span>
            <span className="text-mrgn-success">
              {percentFormatter.format(aprToApy(collateralBank.info.state.lendingRate))}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-sm">
              Borrowing
              <br /> Rate (APY)
            </span>
            <span className="text-mrgn-warning">
              {percentFormatter.format(aprToApy(collateralBank.info.state.borrowingRate))}
            </span>
          </div>
        </div>
        {collateralBank.isActive && collateralBank.position.isLending && (
          <div className="text-sm mb-4">
            <span className="text-muted-foreground">Supplied</span> {numeralFormatter(collateralBank.position.amount)}{" "}
            <span>{collateralBank.meta.tokenSymbol}</span>
          </div>
        )}
        <div className="flex gap-2">
          {collateralBank.isActive && collateralBank.position.isLending && (
            <ActionBoxDialog
              activeGroupArg={group}
              requestedBank={collateralBank}
              requestedAction={ActionType.Withdraw}
            >
              <Button className="w-full bg-background border text-foreground hover:bg-accent">Withdraw</Button>
            </ActionBoxDialog>
          )}
          <ActionBoxDialog activeGroupArg={group} requestedBank={collateralBank} requestedAction={ActionType.Deposit}>
            <Button className="w-full bg-background border text-foreground hover:bg-accent">Supply</Button>
          </ActionBoxDialog>
        </div>
      </div>
    </div>
  );
};

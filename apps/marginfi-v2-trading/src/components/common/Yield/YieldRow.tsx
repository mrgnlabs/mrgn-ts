import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight } from "@tabler/icons-react";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ArenaBank, GroupData } from "~/store/tradeStore";
import { getTokenImageURL, cn, getGroupPositionInfo } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface props {
  group: GroupData;
}

export const YieldRow = ({ group }: props) => {
  const { connected } = useWalletContext();
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
        className="pt-2 pb-4 border-b"
        group={group}
        bank={group.pool.token}
        connected={connected}
        isLeveraged={isLeveraged}
      />

      <YieldItem
        className="pt-4 pb-2"
        group={group}
        bank={collateralBank}
        connected={connected}
        isLeveraged={isLeveraged}
      />
    </div>
  );
};

const YieldItem = ({
  group,
  bank,
  connected,
  className,
  isLeveraged,
}: {
  group: GroupData;
  bank: ArenaBank;
  connected: boolean;
  className?: string;
  isLeveraged?: boolean;
}) => {
  return (
    <div className={cn("grid gap-4items-center", className, connected ? "grid-cols-7" : "grid-cols-6")}>
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
      <div className="flex flex-col xl:gap-2 xl:flex-row xl:items-baseline">
        <span className="text-xl">{numeralFormatter(bank.info.state.totalDeposits)}</span>
        <span className="text-sm text-muted-foreground">
          {usdFormatter.format(bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber())}
        </span>
      </div>

      <div className="text-mrgn-success text-right w-32">
        {percentFormatter.format(aprToApy(bank.info.state.lendingRate))}
      </div>
      <div className="text-mrgn-warning text-right w-32">
        {percentFormatter.format(aprToApy(bank.info.state.borrowingRate))}
      </div>
      <div className="flex justify-center">
        <Link href="https://x.com/marginfi" target="_blank">
          <Image
            src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
            width={20}
            height={20}
            alt="marginfi"
            className="rounded-full"
          />
        </Link>
      </div>
      {connected && (
        <div className="pl-2 text-lg flex flex-col xl:gap-1 xl:flex-row xl:items-baseline">
          {bank.isActive && bank.position.isLending && (
            <>
              {numeralFormatter(bank.position.amount)}
              <span className="text-muted-foreground text-sm">{bank.meta.tokenSymbol}</span>
            </>
          )}
        </div>
      )}
      <TooltipProvider>
        <div className="flex justify-end gap-2">
          {bank.isActive && !isLeveraged && bank.position.isLending && group.selectedAccount && (
            <ActionBoxDialog
              activeGroupArg={group}
              requestedBank={bank}
              requestedAction={ActionType.Withdraw}
              requestedAccount={group.selectedAccount}
            >
              <Button className="bg-background border text-foreground hover:bg-accent">Withdraw</Button>
            </ActionBoxDialog>
          )}
          <ActionBoxDialog
            activeGroupArg={group}
            requestedBank={bank}
            requestedAction={ActionType.Deposit}
            requestedAccount={group.selectedAccount ?? undefined}
          >
            {isLeveraged ? (
              <Tooltip>
                <TooltipTrigger className="cursor-default">
                  <Button disabled className="bg-background border text-foreground hover:bg-accent">
                    Supply
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
              <Button className="bg-background border text-foreground hover:bg-accent">Supply</Button>
            )}
          </ActionBoxDialog>
        </div>
      </TooltipProvider>
    </div>
  );
};

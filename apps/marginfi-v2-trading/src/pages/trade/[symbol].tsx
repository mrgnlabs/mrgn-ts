import React from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import { IconChevronDown, IconExternalLink } from "@tabler/icons-react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  tokenPriceFormatter,
  percentFormatter,
  numeralFormatter,
  aprToApy,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";
import { GroupData } from "~/store/tradeStore";
import { getTokenImageURL, cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { ActionComplete } from "~/components/common/ActionComplete";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { TokenCombobox } from "~/components/common/TokenCombobox";
import { PoolShare } from "~/components/common/Pool/PoolShare";
import { Loader } from "~/components/ui/loader";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export default function TradeSymbolPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const side = router.query.side as "long" | "short";
  const [initialized, groupMap, portfolio] = useTradeStore((state) => [
    state.initialized,
    state.groupMap,
    state.portfolio,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [activeGroup, setActiveGroup] = React.useState<GroupData | null>(null);

  const lpPosition = React.useMemo(() => {
    if (!portfolio) return null;
    const tokenLpPosition = portfolio.lpPositions.find((lp) =>
      activeGroup?.pool.token.info.rawBank.address
        ? lp.pool.token.info.rawBank.address.equals(activeGroup?.pool.token.info.rawBank.address)
        : null
    );
    const quoteTokenLpPosition = portfolio.lpPositions.find((lp) =>
      activeGroup?.pool.quoteTokens[0].info.rawBank.address
        ? lp.pool.quoteTokens[0].info.rawBank.address.equals(activeGroup?.pool.quoteTokens[0].info.rawBank.address)
        : null
    );
    return {
      token: tokenLpPosition,
      quoteToken: quoteTokenLpPosition,
    };
  }, [portfolio, activeGroup]);

  const hasTradePosition = React.useMemo(() => {
    const long = portfolio?.long.find(
      (lp) => lp.pool.token.info.state.mint.toBase58() === activeGroup?.pool.token.info.state.mint.toBase58()
    );
    const short = portfolio?.short.find(
      (lp) => lp.pool.token.info.state.mint.toBase58() === activeGroup?.pool.token.info.state.mint.toBase58()
    );
    return long || short;
  }, [portfolio, activeGroup]);

  React.useEffect(() => {
    if (!router.isReady || !initialized) return;

    const symbol = router.query.symbol as string;

    if (!symbol) {
      router.push("/404");
      return;
    }

    const group = groupMap.get(symbol);
    if (!group) {
      router.push("/404");
      return;
    }

    setActiveGroup(group);
  }, [router, groupMap, setActiveGroup, initialized]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pt-8 pb-24 mt:pt-8 md:px-8">
        {(!initialized || !activeGroup) && <Loader label="Loading the arena..." className="mt-8" />}
        {initialized && activeGroup && (
          <div className="w-full space-y-4">
            <div className="bg-background border rounded-xl px-4 py-10 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col items-center px-8 w-full lg:w-1/4 xl:w-1/2">
                  <Image
                    src={getTokenImageURL(activeGroup.pool.token.info.state.mint.toBase58())}
                    alt={activeGroup.pool.token.meta.tokenSymbol}
                    width={72}
                    height={72}
                    className="bg-background border rounded-full mb-2 lg:mb-0"
                  />

                  <TokenCombobox
                    selected={activeGroup}
                    setSelected={(group) => {
                      router.push(`/trade/${group.client.group.address.toBase58()}`);
                    }}
                  >
                    <h1 className="text-lg font-medium mt-2 flex items-center gap-1 px-2 py-1 pl-3 rounded-md cursor-pointer transition-colors hover:bg-accent translate-x-1.5">
                      {activeGroup.pool.token.meta.tokenName} <IconChevronDown size={18} />
                    </h1>
                  </TokenCombobox>
                  <p className="text-sm text-muted-foreground mt-2 lg:mt-0">
                    {activeGroup.pool.token.meta.tokenSymbol}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link
                            href={`https://solscan.io/token/${activeGroup.pool.token.info.state.mint.toBase58()}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs flex items-center gap-1"
                          >
                            {shortenAddress(activeGroup.pool.token.info.state.mint.toBase58())}
                            <IconExternalLink size={12} />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{activeGroup.pool.token.info.state.mint.toBase58()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </p>
                  <PoolShare activeGroup={activeGroup} />
                </div>
                <div className="w-full space-y-10">
                  {activeGroup.pool.token.tokenData && (
                    <div className="grid w-full max-w-md mx-auto gap-1 lg:gap-16 lg:max-w-none lg:grid-cols-3">
                      <div className="grid grid-cols-2 lg:block">
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-sm text-right lg:text-left lg:text-2xl">
                          {tokenPriceFormatter(activeGroup.pool.token.tokenData.price)}
                          <span
                            className={cn(
                              "text-sm ml-1",
                              activeGroup.pool.token.tokenData.priceChange24hr > 0
                                ? "text-mrgn-success"
                                : "text-mrgn-error"
                            )}
                          >
                            {percentFormatter.format(activeGroup.pool.token.tokenData.priceChange24hr / 100)}
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 lg:block">
                        <p className="text-sm text-muted-foreground">24hr Volume</p>
                        <p className="text-sm text-right lg:text-left lg:text-2xl">
                          ${numeralFormatter(activeGroup.pool.token.tokenData.volume24hr)}
                          <span
                            className={cn(
                              "text-sm ml-1",
                              activeGroup.pool.token.tokenData.volumeChange24hr > 0
                                ? "text-mrgn-success"
                                : "text-mrgn-error"
                            )}
                          >
                            {percentFormatter.format(activeGroup.pool.token.tokenData.volumeChange24hr / 100)}
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 lg:block">
                        <p className="text-sm text-muted-foreground">Market cap</p>
                        <p className="text-sm text-right lg:text-left lg:text-2xl">
                          ${numeralFormatter(activeGroup.pool.token.tokenData.marketCap)}
                        </p>
                      </div>
                      {/* {activeGroup.pool.poolData && (
                        <div className="grid grid-cols-2 lg:block">
                          <p className="text-sm text-muted-foreground">Lending pool liquidity</p>
                          <p className="text-sm text-right lg:text-left lg:text-2xl">
                            ${numeralFormatter(activeGroup.pool.poolData.totalLiquidity)}
                          </p>
                        </div>
                      )} */}
                    </div>
                  )}
                  <div className="w-full grid gap-4 max-w-md mx-auto lg:gap-16 lg:max-w-none lg:grid-cols-3">
                    <div className="flex flex-row justify-between space-y-2 lg:block border-b border-border pb-6 lg:border-b-0 lg:pb-0">
                      <div className="flex items-start gap-2 translate-y-0.5">
                        <Image
                          src={getTokenImageURL(activeGroup.pool.token.info.state.mint.toBase58())}
                          alt={activeGroup.pool.token.meta.tokenSymbol}
                          width={32}
                          height={32}
                          className="bg-background border rounded-full"
                        />
                        <div className="leading-tight text-sm">
                          <p>
                            Total Deposits
                            <br />({activeGroup.pool.token.meta.tokenSymbol})
                          </p>
                          <p className="text-mrgn-success">
                            {percentFormatter.format(aprToApy(activeGroup.pool.token.info.state.lendingRate))}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-end gap-2 lg:items-start lg:justify-start">
                        <p className="text-sm lg:text-2xl">
                          $
                          {numeralFormatter(
                            activeGroup.pool.token.info.state.totalDeposits *
                              activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
                          )}
                        </p>
                        {!hasTradePosition &&
                        lpPosition?.token &&
                        lpPosition.token.pool.token.isActive &&
                        activeGroup.selectedAccount ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              asChild
                            >
                              <Button size="sm" variant="outline" className="px-2 py-1.5 h-auto lg:px-4 lg:py-2">
                                Supplied {numeralFormatter(lpPosition.token.pool.token.position.amount)}
                                <div className="border-l pl-2 ml-1">
                                  <IconChevronDown size={14} />
                                </div>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}>
                              <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                                <ActionBoxDialog
                                  requestedBank={activeGroup.pool.token}
                                  requestedAction={ActionType.Deposit}
                                  requestedAccount={activeGroup.selectedAccount}
                                  activeGroupArg={activeGroup}
                                >
                                  <p>Supply more</p>
                                </ActionBoxDialog>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                                <ActionBoxDialog
                                  requestedBank={activeGroup.pool.token}
                                  requestedAction={ActionType.Withdraw}
                                  requestedAccount={activeGroup.selectedAccount}
                                  activeGroupArg={activeGroup}
                                >
                                  <p>Withdraw</p>
                                </ActionBoxDialog>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          !hasTradePosition && (
                            <ActionBoxDialog
                              requestedBank={activeGroup.pool.token}
                              requestedAction={ActionType.Deposit}
                              requestedAccount={activeGroup.selectedAccount || undefined}
                              activeGroupArg={activeGroup}
                            >
                              <Button size="sm" variant="outline" className="px-2 py-1.5 h-auto lg:px-4 lg:py-2">
                                Supply
                              </Button>
                            </ActionBoxDialog>
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row justify-between space-y-2 lg:block">
                      <div className="flex items-start gap-2">
                        <Image
                          src={getTokenImageURL(activeGroup.pool.quoteTokens[0].info.state.mint.toBase58())}
                          alt={activeGroup.pool.quoteTokens[0].meta.tokenSymbol}
                          width={32}
                          height={32}
                          className="bg-background border rounded-full translate-y-0.5"
                        />
                        <div className="leading-tight text-sm">
                          <p>
                            Total Deposits
                            <br />({activeGroup.pool.quoteTokens[0].meta.tokenSymbol})
                          </p>
                          <p className="text-mrgn-success">
                            {percentFormatter.format(aprToApy(activeGroup.pool.quoteTokens[0].info.state.lendingRate))}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-end gap-2 lg:items-start lg:justify-start">
                        <p className="text-sm lg:text-2xl">
                          $
                          {numeralFormatter(
                            activeGroup.pool.quoteTokens[0].info.state.totalDeposits *
                              activeGroup.pool.quoteTokens[0].info.oraclePrice.priceRealtime.price.toNumber()
                          )}
                        </p>
                        {!hasTradePosition &&
                        lpPosition?.quoteToken &&
                        lpPosition.quoteToken.pool.quoteTokens[0].isActive &&
                        activeGroup.selectedAccount ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                              <Button size="sm" variant="outline" className="px-2 py-1.5 h-auto lg:px-4 lg:py-2">
                                Supplied {numeralFormatter(lpPosition.quoteToken.pool.quoteTokens[0].position.amount)}
                                <div className="border-l pl-2 ml-1">
                                  <IconChevronDown size={14} />
                                </div>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}>
                              <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                                <ActionBoxDialog
                                  requestedBank={activeGroup.pool.quoteTokens[0]}
                                  requestedAction={ActionType.Deposit}
                                  requestedAccount={activeGroup.selectedAccount}
                                  activeGroupArg={activeGroup}
                                >
                                  <p>Supply more</p>
                                </ActionBoxDialog>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                                <ActionBoxDialog
                                  requestedBank={activeGroup.pool.quoteTokens[0]}
                                  requestedAction={ActionType.Withdraw}
                                >
                                  <p>Withdraw</p>
                                </ActionBoxDialog>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          !hasTradePosition && (
                            <ActionBoxDialog
                              requestedBank={activeGroup.pool.quoteTokens[0]}
                              requestedAction={ActionType.Deposit}
                              requestedAccount={activeGroup.selectedAccount || undefined}
                              activeGroupArg={activeGroup}
                            >
                              <Button size="sm" variant="outline" className="px-2 py-1.5 h-auto lg:px-4 lg:py-2">
                                Supply
                              </Button>
                            </ActionBoxDialog>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl space-y-4">
              <div className="flex relative w-full">
                <div className="flex flex-col-reverse w-full gap-4 lg:flex-row">
                  <div className="flex-4 border rounded-xl overflow-hidden w-full">
                    <TVWidget token={activeGroup.pool.token} />
                  </div>
                  <div className="flex lg:max-w-sm w-full lg:ml-auto">
                    <TradingBox activeGroup={activeGroup} side={side} />
                  </div>
                </div>
              </div>
              {!isMobile && (
                <div className="pt-4">
                  <PositionList activeGroupPk={activeGroup.groupPk} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {previousTxn && <ActionComplete />}
    </>
  );
}

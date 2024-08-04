import React from "react";

import Image from "next/image";
import { useRouter } from "next/router";
import { IconChevronDown } from "@tabler/icons-react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  tokenPriceFormatter,
  percentFormatter,
  numeralFormatter,
  aprToApy,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { ActionComplete } from "~/components/common/ActionComplete";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
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
  const router = useRouter();
  const side = router.query.side as "long" | "short";
  const [initialized, activeGroupPk, groupMap, portfolio] = useTradeStore((state) => [
    state.initialized,
    state.activeGroup,
    state.groupMap,
    state.portfolio,
  ]);

  const activeGroup = React.useMemo(() => {
    return activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : null;
  }, [activeGroupPk, groupMap]);

  const lpPosition = React.useMemo(() => {
    if (!portfolio) return null;
    const tokenLpPosition = portfolio.lpPositions.find(
      (lp) => lp.pool.token.info.state.mint.toBase58() === activeGroup?.pool.token.info.state.mint.toBase58()
    );
    const quoteTokenLpPosition = portfolio.lpPositions.find(
      (lp) =>
        lp.pool.quoteTokens[0].info.state.mint.toBase58() ===
        activeGroup?.pool.quoteTokens[0].info.state.mint.toBase58()
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

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pt-8 pb-24 mt:pt-8 md:px-8">
        {(!initialized || !activeGroup) && <Loader label="Loading the arena..." className="mt-8" />}
        {initialized && activeGroup && (
          <div className="w-full space-y-4">
            <div className="bg-background border rounded-xl p-8 py-10">
              <div className="flex items-center justify-between gap-8">
                <div className="flex flex-col items-center px-8 w-1/4">
                  <Image
                    src={getTokenImageURL(activeGroup.pool.token.info.state.mint.toBase58())}
                    alt={activeGroup.pool.token.meta.tokenSymbol}
                    width={72}
                    height={72}
                    className="bg-background border rounded-full"
                  />
                  <h1 className="text-lg font-medium mt-2 flex items-center gap-1">
                    {activeGroup.pool.token.meta.tokenName} <IconChevronDown size={18} className="-mr-5" />
                  </h1>
                  <p className="text-sm text-muted-foreground">{activeGroup.pool.token.meta.tokenSymbol}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {shortenAddress(activeGroup.pool.token.info.state.mint.toBase58())}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{activeGroup.pool.token.info.state.mint.toBase58()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </p>
                </div>
                <div className="w-full space-y-10">
                  {activeGroup.pool.token.tokenData && (
                    <div className="grid grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-2xl">
                          {tokenPriceFormatter.format(activeGroup.pool.token.tokenData.price)}
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
                      <div>
                        <p className="text-sm text-muted-foreground">24hr Volume</p>
                        <p className="text-2xl">
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
                      <div>
                        <p className="text-sm text-muted-foreground">Market cap</p>
                        <p className="text-2xl">${numeralFormatter(activeGroup.pool.token.tokenData.marketCap)}</p>
                      </div>
                      {activeGroup.pool.poolData && (
                        <div>
                          <p className="text-sm text-muted-foreground">Pool Liqiuidity</p>
                          <p className="text-2xl">${numeralFormatter(activeGroup.pool.poolData.totalLiquidity)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Image
                          src={getTokenImageURL(activeGroup.pool.token.info.state.mint.toBase58())}
                          alt={activeGroup.pool.token.meta.tokenSymbol}
                          width={32}
                          height={32}
                          className="bg-background border rounded-full"
                        />
                        <div className="leading-tight text-sm">
                          <p>Total Deposits ({activeGroup.pool.token.meta.tokenSymbol})</p>
                          <p className="text-mrgn-success">
                            {percentFormatter.format(aprToApy(activeGroup.pool.token.info.state.lendingRate))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl">
                          $
                          {numeralFormatter(
                            activeGroup.pool.token.info.state.totalDeposits *
                              activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
                          )}
                        </p>
                        {!hasTradePosition && lpPosition?.token && lpPosition.token.pool.token.isActive ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                              <Button size="sm" variant="outline">
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
                                >
                                  <p>Supply more</p>
                                </ActionBoxDialog>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                                <ActionBoxDialog
                                  requestedBank={activeGroup.pool.token}
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
                              requestedBank={activeGroup.pool.token}
                              requestedAction={ActionType.Deposit}
                            >
                              <Button size="sm" variant="outline">
                                Supply
                              </Button>
                            </ActionBoxDialog>
                          )
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Image
                          src={getTokenImageURL(activeGroup.pool.quoteTokens[0].info.state.mint.toBase58())}
                          alt={activeGroup.pool.quoteTokens[0].meta.tokenSymbol}
                          width={32}
                          height={32}
                          className="bg-background border rounded-full"
                        />
                        <div className="leading-tight text-sm">
                          <p>Total Deposits ({activeGroup.pool.quoteTokens[0].meta.tokenSymbol})</p>
                          <p className="text-mrgn-success">
                            {percentFormatter.format(aprToApy(activeGroup.pool.quoteTokens[0].info.state.lendingRate))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl">
                          $
                          {numeralFormatter(
                            activeGroup.pool.quoteTokens[0].info.state.totalDeposits *
                              activeGroup.pool.quoteTokens[0].info.oraclePrice.priceRealtime.price.toNumber()
                          )}
                        </p>
                        {!hasTradePosition &&
                        lpPosition?.quoteToken &&
                        lpPosition.quoteToken.pool.quoteTokens[0].isActive ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                              <Button size="sm" variant="outline">
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
                            >
                              <Button size="sm" variant="outline">
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
                    <TradingBox side={side} />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <PositionList />
              </div>
            </div>
          </div>
        )}
      </div>
      {previousTxn && <ActionComplete />}
    </>
  );
}

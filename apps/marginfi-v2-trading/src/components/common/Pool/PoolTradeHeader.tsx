import React from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import {
  percentFormatter,
  numeralFormatter,
  tokenPriceFormatter,
  usdFormatter,
  shortenAddress,
  aprToApy,
} from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { Desktop, Mobile, cn, capture } from "@mrgnlabs/mrgn-utils";
import { IconChevronDown, IconExternalLink } from "@tabler/icons-react";

import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useTradeStore } from "~/store";
import { GroupData } from "~/store/tradeStore";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { TokenCombobox } from "~/components/common/TokenCombobox";
import { PoolShare } from "~/components/common/Pool/PoolShare";
import { PositionCard } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

export const PoolTradeHeader = ({ activeGroup }: { activeGroup: GroupData }) => {
  const router = useRouter();
  const { connection } = useConnection();
  const { connected, wallet } = useWallet();

  const [fetchTradeState, nativeSolBalance, portfolio] = useTradeStore((state) => [
    state.fetchTradeState,
    state.nativeSolBalance,
    state.portfolio,
  ]);

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

  const isLstQuote = React.useMemo(() => {
    return activeGroup.pool.quoteTokens[0].meta.tokenSymbol === "LST";
  }, [activeGroup]);

  const tokenPrice = React.useMemo(() => {
    if (isLstQuote) {
      const lstPrice = activeGroup.pool.quoteTokens[0].info.oraclePrice.priceRealtime.price.toNumber();
      return `${tokenPriceFormatter(
        activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber() / lstPrice,
        "decimal"
      )} ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`;
    }

    return tokenPriceFormatter(activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber());
  }, [isLstQuote, activeGroup]);

  return (
    <ActionBoxProvider
      banks={[activeGroup.pool.token, activeGroup.pool.quoteTokens[0]]}
      nativeSolBalance={nativeSolBalance}
      marginfiClient={activeGroup.client}
      selectedAccount={activeGroup.selectedAccount}
      connected={connected}
      accountSummaryArg={activeGroup.accountSummary}
      showActionComplete={false}
      hidePoolStats={["type"]}
    >
      <div className="px-4 pb-10 lg:px-8 lg:py-10 lg:bg-background lg:border lg:rounded-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center px-8 w-full lg:w-1/4 xl:w-1/2">
            <Image
              src={activeGroup.pool.token.meta.tokenLogoUri}
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
            <p className="text-sm text-muted-foreground mt-2 lg:mt-0">{activeGroup.pool.token.meta.tokenSymbol}</p>
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
                    {tokenPrice}
                    {isLstQuote ? (
                      <span className="text-sm text-muted-foreground block">
                        {tokenPriceFormatter(activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber())}{" "}
                        USD
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-sm ml-1",
                          activeGroup.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                        )}
                      >
                        {activeGroup.pool.token.tokenData.priceChange24hr > 0 && "+"}
                        {percentFormatter.format(activeGroup.pool.token.tokenData.priceChange24hr / 100)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:block">
                  <p className="text-sm text-muted-foreground">24hr Volume</p>
                  <p className="text-sm text-right lg:text-left lg:text-2xl">
                    ${numeralFormatter(activeGroup.pool.token.tokenData.volume24hr)}
                    <span
                      className={cn(
                        "text-sm ml-1",
                        activeGroup.pool.token.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                      )}
                    >
                      {activeGroup.pool.token.tokenData.volumeChange24hr > 0 && "+"}
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
                {activeGroup.pool.poolData && (
                  <div className="grid grid-cols-2 lg:hidden">
                    <p className="text-sm text-muted-foreground">Lending pool liquidity</p>
                    <p className="text-sm text-right lg:text-left lg:text-2xl">
                      ${numeralFormatter(activeGroup.pool.poolData.totalLiquidity)}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="w-full grid gap-4 max-w-md mx-auto lg:gap-16 lg:max-w-none lg:grid-cols-3">
              <div className="border-y border-border py-6 lg:border-b-0 lg:py-0 lg:border-t-0">
                <div className="flex flex-row justify-between space-y-2 lg:block">
                  <div className="flex items-start gap-2 translate-y-0.5">
                    <Image
                      src={activeGroup.pool.token.meta.tokenLogoUri}
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
                        {percentFormatter.format(aprToApy(activeGroup.pool.token.info.state.lendingRate))} APY
                      </p>
                      {!hasTradePosition &&
                        lpPosition?.token &&
                        lpPosition.token.pool.token.isActive &&
                        activeGroup.selectedAccount && <p className="mt-2 lg:hidden">Supplied</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 lg:items-start lg:justify-start">
                    <p className="text-right lg:text-left lg:text-2xl">
                      {usdFormatter.format(
                        activeGroup.pool.token.info.state.totalDeposits *
                          activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    </p>
                    {!hasTradePosition &&
                      lpPosition?.token &&
                      lpPosition.token.pool.token.isActive &&
                      activeGroup.selectedAccount && (
                        <p className="mt-5 text-right lg:text-left lg:hidden">
                          {usdFormatter.format(lpPosition.token.pool.token.position.amount)}
                        </p>
                      )}
                    <Desktop>
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
                              <ActionBox.Lend
                                isDialog={true}
                                useProvider={true}
                                lendProps={{
                                  connected: connected,
                                  requestedLendType: ActionType.Deposit,
                                  requestedBank: activeGroup.pool.token,
                                  showAvailableCollateral: false,
                                  captureEvent: () => {
                                    capture("trade_supply_btn_click", {
                                      group: activeGroup.client.group.address.toBase58(),
                                      bank: activeGroup.pool.token.meta.tokenSymbol,
                                    });
                                  },
                                  onComplete: () => {
                                    fetchTradeState({
                                      connection,
                                      wallet,
                                    });
                                  },
                                }}
                                dialogProps={{
                                  trigger: <p>Supply more</p>,
                                  title: `Supply ${activeGroup.pool.token.meta.tokenSymbol}`,
                                }}
                              />
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                              <ActionBox.Lend
                                isDialog={true}
                                useProvider={true}
                                lendProps={{
                                  connected: connected,
                                  requestedLendType: ActionType.Withdraw,
                                  requestedBank: activeGroup.pool.token,
                                  showAvailableCollateral: false,
                                  captureEvent: () => {
                                    capture("trade_withdraw_btn_click", {
                                      group: activeGroup.client.group.address.toBase58(),
                                      bank: activeGroup.pool.token.meta.tokenSymbol,
                                    });
                                  },
                                  onComplete: () => {
                                    fetchTradeState({
                                      connection,
                                      wallet,
                                    });
                                  },
                                }}
                                dialogProps={{
                                  trigger: <p>Withdraw</p>,
                                  title: `Withdraw ${activeGroup.pool.token.meta.tokenSymbol}`,
                                }}
                              />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        !hasTradePosition && (
                          <ActionBox.Lend
                            isDialog={true}
                            useProvider={true}
                            lendProps={{
                              connected: connected,
                              requestedLendType: ActionType.Deposit,
                              requestedBank: activeGroup.pool.token,
                              showAvailableCollateral: false,
                              captureEvent: () => {
                                capture("trade_supply_btn_click", {
                                  group: activeGroup.client.group.address.toBase58(),
                                  bank: activeGroup.pool.token.meta.tokenSymbol,
                                });
                              },
                              onComplete: () => {
                                fetchTradeState({
                                  connection,
                                  wallet,
                                });
                              },
                            }}
                            dialogProps={{
                              trigger: (
                                <Button variant="outline" size="sm">
                                  Supply
                                </Button>
                              ),
                              title: `Supply ${activeGroup.pool.token.meta.tokenSymbol}`,
                            }}
                          />
                        )
                      )}
                    </Desktop>
                  </div>
                </div>
                <Mobile>
                  {!hasTradePosition &&
                  lpPosition?.token &&
                  lpPosition.token.pool.token.isActive &&
                  activeGroup.selectedAccount ? (
                    <div className="mt-4">
                      <div className="flex gap-4">
                        <ActionBox.Lend
                          isDialog={true}
                          useProvider={true}
                          lendProps={{
                            connected: connected,
                            requestedLendType: ActionType.Deposit,
                            requestedBank: activeGroup.pool.token,
                            showAvailableCollateral: false,
                            captureEvent: () => {
                              capture("trade_supply_btn_click", {
                                group: activeGroup.client.group.address.toBase58(),
                                bank: activeGroup.pool.token.meta.tokenSymbol,
                              });
                            },
                            onComplete: () => {
                              fetchTradeState({
                                connection,
                                wallet,
                              });
                            },
                          }}
                          dialogProps={{
                            trigger: (
                              <Button variant="outline" className="gap-1 min-w-16">
                                Supply more
                              </Button>
                            ),
                            title: `Supply ${activeGroup.pool.token.meta.tokenSymbol}`,
                          }}
                        />
                        <ActionBox.Lend
                          isDialog={true}
                          useProvider={true}
                          lendProps={{
                            connected: connected,
                            requestedLendType: ActionType.Withdraw,
                            requestedBank: activeGroup.pool.token,
                            showAvailableCollateral: false,
                            captureEvent: () => {
                              capture("trade_withdraw_btn_click", {
                                group: activeGroup.client.group.address.toBase58(),
                                bank: activeGroup.pool.token.meta.tokenSymbol,
                              });
                            },
                            onComplete: () => {
                              fetchTradeState({
                                connection,
                                wallet,
                              });
                            },
                          }}
                          dialogProps={{
                            trigger: "Withdraw",
                            title: `Withdraw ${activeGroup.pool.token.meta.tokenSymbol}`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    !hasTradePosition && (
                      <ActionBox.Lend
                        isDialog={true}
                        useProvider={true}
                        lendProps={{
                          connected: connected,
                          requestedLendType: ActionType.Deposit,
                          requestedBank: activeGroup.pool.token,
                          showAvailableCollateral: false,
                          captureEvent: () => {
                            capture("trade_supply_btn_click", {
                              group: activeGroup.client.group.address.toBase58(),
                              bank: activeGroup.pool.token.meta.tokenSymbol,
                            });
                          },
                          onComplete: () => {
                            fetchTradeState({
                              connection,
                              wallet,
                            });
                          },
                        }}
                        dialogProps={{
                          trigger: (
                            <Button variant="outline" size="sm">
                              Supply
                            </Button>
                          ),
                          title: `Supply ${activeGroup.pool.token.meta.tokenSymbol}`,
                        }}
                      />
                    )
                  )}
                </Mobile>
              </div>
              <div className="flex flex-row justify-between space-y-2 lg:block">
                <div className="flex items-start gap-2">
                  <Image
                    src={activeGroup.pool.quoteTokens[0].meta.tokenLogoUri}
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
                    {!hasTradePosition &&
                      lpPosition?.quoteToken &&
                      lpPosition.quoteToken.pool.quoteTokens[0].isActive &&
                      activeGroup.selectedAccount && <p className="mt-2 lg:hidden">Supplied</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 lg:items-start lg:justify-start">
                  <p className="text-right lg:text-left lg:text-2xl">
                    {usdFormatter.format(
                      activeGroup.pool.quoteTokens[0].info.state.totalDeposits *
                        activeGroup.pool.quoteTokens[0].info.oraclePrice.priceRealtime.price.toNumber()
                    )}
                  </p>
                  {!hasTradePosition &&
                    lpPosition?.quoteToken &&
                    lpPosition.quoteToken.pool.quoteTokens[0].isActive &&
                    activeGroup.selectedAccount && (
                      <p className="mt-5 text-right lg:text-left lg:hidden">
                        {usdFormatter.format(lpPosition.quoteToken.pool.quoteTokens[0].position.amount)}
                      </p>
                    )}
                  <Desktop>
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
                            <ActionBox.Lend
                              isDialog={true}
                              useProvider={true}
                              lendProps={{
                                connected: connected,
                                requestedLendType: ActionType.Deposit,
                                requestedBank: activeGroup.pool.quoteTokens[0],
                                showAvailableCollateral: false,
                                captureEvent: () => {
                                  capture("trade_supply_btn_click", {
                                    group: activeGroup.client.group.address.toBase58(),
                                    bank: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                                  });
                                },
                                onComplete: () => {
                                  fetchTradeState({
                                    connection,
                                    wallet,
                                  });
                                },
                              }}
                              dialogProps={{
                                trigger: <p>Supply more</p>,
                                title: `Supply ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                              }}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()}>
                            <ActionBox.Lend
                              isDialog={true}
                              useProvider={true}
                              lendProps={{
                                connected: connected,
                                requestedLendType: ActionType.Withdraw,
                                requestedBank: activeGroup.pool.quoteTokens[0],
                                showAvailableCollateral: false,
                                captureEvent: () => {
                                  capture("trade_withdraw_btn_click", {
                                    group: activeGroup.client.group.address.toBase58(),
                                    bank: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                                  });
                                },
                                onComplete: () => {
                                  fetchTradeState({
                                    connection,
                                    wallet,
                                  });
                                },
                              }}
                              dialogProps={{
                                trigger: <p>Withdraw</p>,
                                title: `Withdraw ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                              }}
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      !hasTradePosition && (
                        <ActionBox.Lend
                          isDialog={true}
                          useProvider={true}
                          lendProps={{
                            connected: connected,
                            requestedLendType: ActionType.Deposit,
                            requestedBank: activeGroup.pool.quoteTokens[0],
                            showAvailableCollateral: false,
                            captureEvent: () => {
                              capture("trade_supply_btn_click", {
                                group: activeGroup.client.group.address.toBase58(),
                                bank: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                              });
                            },
                            onComplete: () => {
                              fetchTradeState({
                                connection,
                                wallet,
                              });
                            },
                          }}
                          dialogProps={{
                            trigger: (
                              <Button variant="outline" className="gap-1 min-w-16">
                                Supply
                              </Button>
                            ),
                            title: `Supply ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                          }}
                        />
                      )
                    )}
                  </Desktop>
                </div>
              </div>
              <Mobile>
                {!hasTradePosition &&
                lpPosition?.quoteToken &&
                lpPosition.quoteToken.pool.quoteTokens[0].isActive &&
                activeGroup.selectedAccount ? (
                  <div>
                    <div className="flex gap-4">
                      <ActionBox.Lend
                        isDialog={true}
                        useProvider={true}
                        lendProps={{
                          connected: connected,
                          requestedLendType: ActionType.Deposit,
                          requestedBank: activeGroup.pool.quoteTokens[0],
                          showAvailableCollateral: false,
                          captureEvent: () => {
                            capture("trade_supply_btn_click", {
                              group: activeGroup.client.group.address.toBase58(),
                              bank: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                            });
                          },
                          onComplete: () => {
                            fetchTradeState({
                              connection,
                              wallet,
                            });
                          },
                        }}
                        dialogProps={{
                          trigger: (
                            <Button variant="outline" className="gap-1 min-w-16">
                              Supply more
                            </Button>
                          ),
                          title: `Supply ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                        }}
                      />
                      <ActionBox.Lend
                        isDialog={true}
                        useProvider={true}
                        lendProps={{
                          connected: connected,
                          requestedLendType: ActionType.Withdraw,
                          requestedBank: activeGroup.pool.quoteTokens[0],
                          showAvailableCollateral: false,
                          captureEvent: () => {
                            capture("trade_withdraw_btn_click", {
                              group: activeGroup.client.group.address.toBase58(),
                              bank: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                            });
                          },
                          onComplete: () => {
                            fetchTradeState({
                              connection,
                              wallet,
                            });
                          },
                        }}
                        dialogProps={{
                          trigger: (
                            <Button variant="outline" className="gap-1 min-w-16">
                              Withdraw
                            </Button>
                          ),
                          title: `Withdraw ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  !hasTradePosition && (
                    <ActionBox.Lend
                      isDialog={true}
                      useProvider={true}
                      lendProps={{
                        connected: connected,
                        requestedLendType: ActionType.Deposit,
                        requestedBank: activeGroup.pool.quoteTokens[0],
                        showAvailableCollateral: false,
                        captureEvent: () => {
                          capture("trade_supply_btn_click", {
                            group: activeGroup.client.group.address.toBase58(),
                            bank: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                          });
                        },
                        onComplete: () => {
                          fetchTradeState({
                            connection,
                            wallet,
                          });
                        },
                      }}
                      dialogProps={{
                        trigger: (
                          <Button variant="outline" className="gap-1 min-w-16">
                            Supply
                          </Button>
                        ),
                        title: `Supply ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                      }}
                    />
                  )
                )}
              </Mobile>
            </div>
          </div>
        </div>
        {hasTradePosition && (
          <Mobile>
            <div className="mt-8 space-y-2">
              <p className="flex items-center text-sm">
                <span
                  className={cn(
                    "flex w-2.5 h-2.5 rounded-full mr-2",
                    activeGroup.pool.token.isActive && activeGroup.pool.token.position.isLending
                      ? "bg-mrgn-green"
                      : "bg-mrgn-error"
                  )}
                ></span>
                Open {activeGroup.pool.token.isActive && activeGroup.pool.token.position.isLending ? "long " : "short "}
                position
              </p>
              <PositionCard groupData={activeGroup} size="sm" />
            </div>
          </Mobile>
        )}
      </div>
    </ActionBoxProvider>
  );
};

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
import { useTradeStore, useTradeStoreV2 } from "~/store";
import { ArenaPool, GroupData } from "~/store/tradeStore";

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
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { ArenaPoolV2, GroupStatus } from "~/store/tradeStoreV2";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";

export const PoolTradeHeader = ({ activePool }: { activePool: ArenaPoolV2 }) => {
  const router = useRouter();
  const { connection } = useConnection();
  const { connected, wallet } = useWallet();

  const extendedPool = useExtendedPool(activePool);
  const client = useMarginfiClient({ groupPk: activePool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: activePool.groupPk,
    banks: [extendedPool.tokenBank, extendedPool.quoteBank],
  });

  const [refreshGroup, nativeSolBalance] = useTradeStoreV2((state) => [state.refreshGroup, state.nativeSolBalance]);

  // const isLstQuote = React.useMemo(() => {
  //   return activeGroup.pool.quoteTokens[0].meta.tokenSymbol === "LST";
  // }, [activeGroup]);

  const tokenPrice = React.useMemo(() => {
    // if (isLstQuote) {
    const lstPrice = extendedPool.quoteBank.info.oraclePrice.priceRealtime.price.toNumber();
    return `${tokenPriceFormatter(
      extendedPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber() / lstPrice,
      "decimal"
    )} ${extendedPool.quoteBank.meta.tokenSymbol}`;
    // }

    // return tokenPriceFormatter(activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber());
  }, [
    extendedPool.quoteBank.info.oraclePrice.priceRealtime.price,
    extendedPool.quoteBank.meta.tokenSymbol,
    extendedPool.tokenBank.info.oraclePrice.priceRealtime.price,
  ]);

  return (
    <ActionBoxProvider
      banks={[extendedPool.tokenBank, extendedPool.quoteBank]}
      nativeSolBalance={nativeSolBalance}
      marginfiClient={client}
      selectedAccount={wrappedAccount}
      connected={connected}
      accountSummaryArg={accountSummary ?? undefined}
      showActionComplete={false}
      hidePoolStats={["type"]}
    >
      <div className="px-4 pb-10 lg:px-8 lg:py-10 lg:bg-background lg:border lg:rounded-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center px-8 w-full lg:w-1/4 xl:w-1/2">
            <Image
              src={extendedPool.tokenBank.meta.tokenLogoUri}
              alt={extendedPool.tokenBank.meta.tokenSymbol}
              width={72}
              height={72}
              className="bg-background border rounded-full mb-2 lg:mb-0"
            />

            <TokenCombobox
              selected={extendedPool}
              setSelected={(pool) => {
                router.push(`/trade/${pool.groupPk.toBase58()}`);
              }}
            >
              <h1 className="text-lg font-medium mt-2 flex items-center gap-1 px-2 py-1 pl-3 rounded-md cursor-pointer transition-colors hover:bg-accent translate-x-1.5">
                {extendedPool.tokenBank.meta.tokenName} <IconChevronDown size={18} />
              </h1>
            </TokenCombobox>
            <p className="text-sm text-muted-foreground mt-2 lg:mt-0">{extendedPool.tokenBank.meta.tokenSymbol}</p>
            <p className="text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href={`https://solscan.io/token/${extendedPool.tokenBank.info.state.mint.toBase58()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-xs flex items-center gap-1"
                    >
                      {shortenAddress(extendedPool.tokenBank.info.state.mint.toBase58())}
                      <IconExternalLink size={12} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{extendedPool.tokenBank.info.state.mint.toBase58()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
            <PoolShare activePool={activePool} />
          </div>
          <div className="w-full space-y-10">
            {extendedPool.tokenBank.tokenData && (
              <div className="grid w-full max-w-md mx-auto gap-1 lg:gap-16 lg:max-w-none lg:grid-cols-3">
                <div className="grid grid-cols-2 lg:block">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-sm text-right lg:text-left lg:text-2xl">
                    {tokenPrice}
                    {/* {isLstQuote ? ( */}
                    <span className="text-sm text-muted-foreground block">
                      {tokenPriceFormatter(extendedPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())} USD
                    </span>
                    {/* ) : (
                      <span
                        className={cn(
                          "text-sm ml-1",
                          activeGroup.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                        )}
                      >
                        {activeGroup.pool.token.tokenData.priceChange24hr > 0 && "+"}
                        {percentFormatter.format(activeGroup.pool.token.tokenData.priceChange24hr / 100)}
                      </span>
                    )} */}
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:block">
                  <p className="text-sm text-muted-foreground">24hr Volume</p>
                  <p className="text-sm text-right lg:text-left lg:text-2xl">
                    ${numeralFormatter(extendedPool.tokenBank.tokenData.volume24hr)}
                    <span
                      className={cn(
                        "text-sm ml-1",
                        extendedPool.tokenBank.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                      )}
                    >
                      {extendedPool.tokenBank.tokenData.volumeChange24hr > 0 && "+"}
                      {percentFormatter.format(extendedPool.tokenBank.tokenData.volumeChange24hr / 100)}
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:block">
                  <p className="text-sm text-muted-foreground">Market cap</p>
                  <p className="text-sm text-right lg:text-left lg:text-2xl">
                    ${numeralFormatter(extendedPool.tokenBank.tokenData.marketCap)}
                  </p>
                </div>
                {/* {extendedPool.poolData && (
                  <div className="grid grid-cols-2 lg:hidden">
                    <p className="text-sm text-muted-foreground">Lending pool liquidity</p>
                    <p className="text-sm text-right lg:text-left lg:text-2xl">
                      ${numeralFormatter(extendedPool.poolData.totalLiquidity)}
                    </p>
                  </div>
                )} */}
              </div>
            )}
            <div className="w-full grid gap-4 max-w-md mx-auto lg:gap-16 lg:max-w-none lg:grid-cols-3">
              <div className="border-y border-border py-6 lg:border-b-0 lg:py-0 lg:border-t-0">
                <div className="flex flex-row justify-between space-y-2 lg:block">
                  <div className="flex items-start gap-2 translate-y-0.5">
                    <Image
                      src={extendedPool.tokenBank.meta.tokenLogoUri}
                      alt={extendedPool.tokenBank.meta.tokenSymbol}
                      width={32}
                      height={32}
                      className="bg-background border rounded-full"
                    />
                    <div className="leading-tight text-sm">
                      <p>
                        Total Deposits
                        <br />({extendedPool.tokenBank.meta.tokenSymbol})
                      </p>
                      <p className="text-mrgn-success">
                        {percentFormatter.format(aprToApy(extendedPool.tokenBank.info.state.lendingRate))} APY
                      </p>
                      {extendedPool.status === GroupStatus.LP && <p className="mt-2 lg:hidden">Supplied</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 lg:items-start lg:justify-start">
                    <p className="text-right lg:text-left lg:text-2xl">
                      {usdFormatter.format(
                        extendedPool.tokenBank.info.state.totalDeposits *
                          extendedPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    </p>
                    {extendedPool.status === GroupStatus.LP && extendedPool.tokenBank.isActive && (
                      <p className="mt-5 text-right lg:text-left lg:hidden">
                        {usdFormatter.format(extendedPool.tokenBank.position.amount)}
                      </p>
                    )}
                    <Desktop>
                      {extendedPool.status === GroupStatus.LP && extendedPool.tokenBank.isActive ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            asChild
                          >
                            <Button size="sm" variant="outline" className="px-2 py-1.5 h-auto lg:px-4 lg:py-2">
                              Supplied {numeralFormatter(extendedPool.tokenBank.position.amount)}
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
                                  requestedBank: extendedPool.tokenBank,
                                  showAvailableCollateral: false,
                                  captureEvent: () => {
                                    capture("trade_supply_btn_click", {
                                      group: extendedPool.groupPk.toBase58(),
                                      bank: extendedPool.tokenBank.meta.tokenSymbol,
                                    });
                                  },
                                  onComplete: () => {
                                    refreshGroup({
                                      groupPk: extendedPool.groupPk,
                                      banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                                    });
                                  },
                                }}
                                dialogProps={{
                                  trigger: <p>Supply more</p>,
                                  title: `Supply ${extendedPool.tokenBank.meta.tokenSymbol}`,
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
                                  requestedBank: extendedPool.tokenBank,
                                  showAvailableCollateral: false,
                                  captureEvent: () => {
                                    capture("trade_withdraw_btn_click", {
                                      group: extendedPool.groupPk.toBase58(),
                                      bank: extendedPool.tokenBank.meta.tokenSymbol,
                                    });
                                  },
                                  onComplete: () => {
                                    refreshGroup({
                                      groupPk: extendedPool.groupPk,
                                      banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                                    });
                                  },
                                }}
                                dialogProps={{
                                  trigger: <p>Withdraw</p>,
                                  title: `Withdraw ${extendedPool.tokenBank.meta.tokenSymbol}`,
                                }}
                              />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        extendedPool.status !== GroupStatus.LONG &&
                        extendedPool.status !== GroupStatus.SHORT && (
                          <ActionBox.Lend
                            isDialog={true}
                            useProvider={true}
                            lendProps={{
                              connected: connected,
                              requestedLendType: ActionType.Deposit,
                              requestedBank: extendedPool.tokenBank,
                              showAvailableCollateral: false,
                              captureEvent: () => {
                                capture("trade_supply_btn_click", {
                                  group: extendedPool.groupPk.toBase58(),
                                  bank: extendedPool.tokenBank.meta.tokenSymbol,
                                });
                              },
                              onComplete: () => {
                                refreshGroup({
                                  groupPk: extendedPool.groupPk,
                                  banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                                });
                              },
                            }}
                            dialogProps={{
                              trigger: (
                                <Button variant="outline" size="sm">
                                  Supply
                                </Button>
                              ),
                              title: `Supply ${extendedPool.tokenBank.meta.tokenSymbol}`,
                            }}
                          />
                        )
                      )}
                    </Desktop>
                  </div>
                </div>
                <Mobile>
                  {extendedPool.status === GroupStatus.LP && extendedPool.tokenBank.isActive ? (
                    <div className="mt-4">
                      <div className="flex gap-4">
                        <ActionBox.Lend
                          isDialog={true}
                          useProvider={true}
                          lendProps={{
                            connected: connected,
                            requestedLendType: ActionType.Deposit,
                            requestedBank: extendedPool.tokenBank,
                            showAvailableCollateral: false,
                            captureEvent: () => {
                              capture("trade_supply_btn_click", {
                                group: extendedPool.groupPk.toBase58(),
                                bank: extendedPool.tokenBank.meta.tokenSymbol,
                              });
                            },
                            onComplete: () => {
                              refreshGroup({
                                groupPk: extendedPool.groupPk,
                                banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                              });
                            },
                          }}
                          dialogProps={{
                            trigger: (
                              <Button variant="outline" className="gap-1 min-w-16">
                                Supply more
                              </Button>
                            ),
                            title: `Supply ${extendedPool.tokenBank.meta.tokenSymbol}`,
                          }}
                        />
                        <ActionBox.Lend
                          isDialog={true}
                          useProvider={true}
                          lendProps={{
                            connected: connected,
                            requestedLendType: ActionType.Withdraw,
                            requestedBank: extendedPool.tokenBank,
                            showAvailableCollateral: false,
                            captureEvent: () => {
                              capture("trade_withdraw_btn_click", {
                                group: extendedPool.groupPk.toBase58(),
                                bank: extendedPool.tokenBank.meta.tokenSymbol,
                              });
                            },
                            onComplete: () => {
                              refreshGroup({
                                groupPk: extendedPool.groupPk,
                                banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                              });
                            },
                          }}
                          dialogProps={{
                            trigger: "Withdraw",
                            title: `Withdraw ${extendedPool.tokenBank.meta.tokenSymbol}`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    extendedPool.status !== GroupStatus.LONG &&
                    extendedPool.status !== GroupStatus.SHORT && (
                      <ActionBox.Lend
                        isDialog={true}
                        useProvider={true}
                        lendProps={{
                          connected: connected,
                          requestedLendType: ActionType.Deposit,
                          requestedBank: extendedPool.tokenBank,
                          showAvailableCollateral: false,
                          captureEvent: () => {
                            capture("trade_supply_btn_click", {
                              group: extendedPool.groupPk.toBase58(),
                              bank: extendedPool.tokenBank.meta.tokenSymbol,
                            });
                          },
                          onComplete: () => {
                            refreshGroup({
                              groupPk: extendedPool.groupPk,
                              banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                            });
                          },
                        }}
                        dialogProps={{
                          trigger: (
                            <Button variant="outline" size="sm">
                              Supply
                            </Button>
                          ),
                          title: `Supply ${extendedPool.tokenBank.meta.tokenSymbol}`,
                        }}
                      />
                    )
                  )}
                </Mobile>
              </div>
              <div className="flex flex-row justify-between space-y-2 lg:block">
                <div className="flex items-start gap-2">
                  <Image
                    src={extendedPool.quoteBank.meta.tokenLogoUri}
                    alt={extendedPool.quoteBank.meta.tokenSymbol}
                    width={32}
                    height={32}
                    className="bg-background border rounded-full translate-y-0.5"
                  />
                  <div className="leading-tight text-sm">
                    <p>
                      Total Deposits
                      <br />({extendedPool.quoteBank.meta.tokenSymbol})
                    </p>
                    <p className="text-mrgn-success">
                      {percentFormatter.format(aprToApy(extendedPool.quoteBank.info.state.lendingRate))}
                    </p>
                    {extendedPool.status === GroupStatus.LP && extendedPool.tokenBank.isActive && (
                      <p className="mt-2 lg:hidden">Supplied</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 lg:items-start lg:justify-start">
                  <p className="text-right lg:text-left lg:text-2xl">
                    {usdFormatter.format(
                      extendedPool.quoteBank.info.state.totalDeposits *
                        extendedPool.quoteBank.info.oraclePrice.priceRealtime.price.toNumber()
                    )}
                  </p>
                  {extendedPool.status === GroupStatus.LP && extendedPool.tokenBank.isActive && (
                    <p className="mt-5 text-right lg:text-left lg:hidden">
                      {usdFormatter.format(extendedPool.tokenBank.position.amount)}
                    </p>
                  )}
                  <Desktop>
                    {extendedPool.status === GroupStatus.LP && extendedPool.tokenBank.isActive ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                          <Button size="sm" variant="outline" className="px-2 py-1.5 h-auto lg:px-4 lg:py-2">
                            Supplied {numeralFormatter(extendedPool.tokenBank.position.amount)}
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
                                requestedBank: extendedPool.quoteBank,
                                showAvailableCollateral: false,
                                captureEvent: () => {
                                  capture("trade_supply_btn_click", {
                                    group: extendedPool.groupPk.toBase58(),
                                    bank: extendedPool.quoteBank.meta.tokenSymbol,
                                  });
                                },
                                onComplete: () => {
                                  refreshGroup({
                                    groupPk: extendedPool.groupPk,
                                    banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                                  });
                                },
                              }}
                              dialogProps={{
                                trigger: <p>Supply more</p>,
                                title: `Supply ${extendedPool.quoteBank.meta.tokenSymbol}`,
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
                                requestedBank: extendedPool.quoteBank,
                                showAvailableCollateral: false,
                                captureEvent: () => {
                                  capture("trade_withdraw_btn_click", {
                                    group: extendedPool.groupPk.toBase58(),
                                    bank: extendedPool.quoteBank.meta.tokenSymbol,
                                  });
                                },
                                onComplete: () => {
                                  refreshGroup({
                                    groupPk: extendedPool.groupPk,
                                    banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
                                  });
                                },
                              }}
                              dialogProps={{
                                trigger: <p>Withdraw</p>,
                                title: `Withdraw ${extendedPool.quoteBank.meta.tokenSymbol}`,
                              }}
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      extendedPool.status !== GroupStatus.LONG &&
                      extendedPool.status !== GroupStatus.SHORT && (
                        <ActionBox.Lend
                          isDialog={true}
                          useProvider={true}
                          lendProps={{
                            connected: connected,
                            requestedLendType: ActionType.Deposit,
                            requestedBank: extendedPool.quoteBank,
                            showAvailableCollateral: false,
                            captureEvent: () => {
                              capture("trade_supply_btn_click", {
                                group: extendedPool.groupPk.toBase58(),
                                bank: extendedPool.quoteBank.meta.tokenSymbol,
                              });
                            },
                            onComplete: () => {
                              refreshGroup({
                                groupPk: extendedPool.groupPk,
                                banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
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
                            title: `Supply ${extendedPool.quoteBank.meta.tokenSymbol}`,
                          }}
                        />
                      )
                    )}
                  </Desktop>
                </div>
              </div>
              <Mobile>
                {extendedPool.status === GroupStatus.LP ? (
                  <div>
                    <div className="flex gap-4">
                      <ActionBox.Lend
                        isDialog={true}
                        useProvider={true}
                        lendProps={{
                          connected: connected,
                          requestedLendType: ActionType.Deposit,
                          requestedBank: extendedPool.quoteBank,
                          showAvailableCollateral: false,
                          captureEvent: () => {
                            capture("trade_supply_btn_click", {
                              group: extendedPool.groupPk.toBase58(),
                              bank: extendedPool.quoteBank.meta.tokenSymbol,
                            });
                          },
                          onComplete: () => {
                            refreshGroup({
                              groupPk: extendedPool.groupPk,
                              banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
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
                          title: `Supply ${extendedPool.quoteBank.meta.tokenSymbol}`,
                        }}
                      />
                      <ActionBox.Lend
                        isDialog={true}
                        useProvider={true}
                        lendProps={{
                          connected: connected,
                          requestedLendType: ActionType.Withdraw,
                          requestedBank: extendedPool.quoteBank,
                          showAvailableCollateral: false,
                          captureEvent: () => {
                            capture("trade_withdraw_btn_click", {
                              group: extendedPool.groupPk.toBase58(),
                              bank: extendedPool.quoteBank.meta.tokenSymbol,
                            });
                          },
                          onComplete: () => {
                            refreshGroup({
                              groupPk: extendedPool.groupPk,
                              banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
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
                          title: `Withdraw ${extendedPool.quoteBank.meta.tokenSymbol}`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  extendedPool.status !== GroupStatus.LONG &&
                  extendedPool.status !== GroupStatus.SHORT && (
                    <ActionBox.Lend
                      isDialog={true}
                      useProvider={true}
                      lendProps={{
                        connected: connected,
                        requestedLendType: ActionType.Deposit,
                        requestedBank: extendedPool.quoteBank,
                        showAvailableCollateral: false,
                        captureEvent: () => {
                          capture("trade_supply_btn_click", {
                            group: extendedPool.groupPk.toBase58(),
                            bank: extendedPool.quoteBank.meta.tokenSymbol,
                          });
                        },
                        onComplete: () => {
                          refreshGroup({
                            groupPk: extendedPool.groupPk,
                            banks: [extendedPool.tokenBank.address, extendedPool.quoteBank.address],
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
                        title: `Supply ${extendedPool.quoteBank.meta.tokenSymbol}`,
                      }}
                    />
                  )
                )}
              </Mobile>
            </div>
          </div>
        </div>
        {(extendedPool.status === GroupStatus.LONG || extendedPool.status === GroupStatus.SHORT) && (
          <Mobile>
            <div className="mt-8 space-y-2">
              <p className="flex items-center text-sm">
                <span
                  className={cn(
                    "flex w-2.5 h-2.5 rounded-full mr-2",
                    extendedPool.tokenBank.isActive && extendedPool.tokenBank.position.isLending
                      ? "bg-mrgn-green"
                      : "bg-mrgn-error"
                  )}
                ></span>
                Open {extendedPool.tokenBank.isActive && extendedPool.tokenBank.position.isLending ? "long " : "short "}
                position
              </p>
              <PositionCard arenaPool={extendedPool} size="sm" />
            </div>
          </Mobile>
        )}
      </div>
    </ActionBoxProvider>
  );
};

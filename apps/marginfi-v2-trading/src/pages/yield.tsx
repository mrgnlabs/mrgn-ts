import React from "react";

import Link from "next/link";
import Image from "next/image";

import Fuse from "fuse.js";
import { IconSortDescending, IconSortAscending, IconArrowRight, IconSearch } from "@tabler/icons-react";
import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useTradeStore, useUiStore } from "~/store";
import { GroupData, TradePoolFilterStates } from "~/store/tradeStore";
import { getTokenImageURL, cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeading } from "~/components/common/PageHeading";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

const sortOptions: {
  value: TradePoolFilterStates;
  label: string;
  dir?: "asc" | "desc";
}[] = [
  { value: TradePoolFilterStates.APY_DESC, label: "APY Desc" },
  { value: TradePoolFilterStates.APY_ASC, label: "APY Asc", dir: "asc" },
  { value: TradePoolFilterStates.LIQUIDITY_DESC, label: "Liquidity Desc" },
  { value: TradePoolFilterStates.LIQUIDITY_ASC, label: "Liquidity Asc", dir: "asc" },
];

let fuse: Fuse<GroupData> | null = null;

export default function PortfolioPage() {
  const [initialized, groupMap, sortBy, setSortBy] = useTradeStore((state) => [
    state.initialized,
    state.groupMap,
    state.sortBy,
    state.setSortBy,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const isMobile = useIsMobile();
  const { connected } = useWalletContext();
  const [search, setSearch] = React.useState("");
  const groups = Array.from(groupMap.values());

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  React.useEffect(() => {
    fuse = new Fuse(groups, {
      includeScore: true,
      threshold: 0.2,
      keys: [
        {
          name: "pool.token.meta.tokenSymbol",
          weight: 0.7,
        },
        {
          name: "pool.quoteTokens[0].meta.tokenSymbol",
          weight: 0.7,
        },
        {
          name: "pool.token.meta.tokenName",
          weight: 0.3,
        },
        {
          name: "pool.quoteTokens[0].meta.tokenName",
          weight: 0.3,
        },
        {
          name: "pool.token.info.state.mint.toBase58()",
          weight: 0.1,
        },
        {
          name: "pool.quoteTokens[0].info.state.mint.toBase58()",
          weight: 0.1,
        },
      ],
    });
  }, [groups]);

  const filteredGroups = React.useMemo(() => {
    if (!fuse) return groups;
    const results = fuse.search(search).map((result) => result.item);
    if (!results.length && !search) {
      return groups;
    } else if (!results) {
      return [];
    }
    return results;
  }, [groups, search]);

  React.useEffect(() => {
    setSortBy(TradePoolFilterStates.APY_DESC);
  }, [setSortBy]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading yield farming..." className="mt-8" />}
        {initialized && (
          <>
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading
                heading="Yield farming"
                body={<p>Supply over-collateralized liquidity and earn yield.</p>}
                links={[]}
              />
            </div>

            <div className="flex justify-center items-center w-full max-w-4xl mx-auto mb-8 mt-4 lg:mb-16 lg:mt-8">
              <div className="w-full relative">
                <Input
                  placeholder={isMobile ? "Search tokens..." : "Search tokens by name, symbol, or mint address..."}
                  className="pl-10 py-2.5 text-lg rounded-full h-auto bg-transparent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <IconSearch
                  size={18}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </div>

            <div className="w-full hidden lg:block">
              {filteredGroups && filteredGroups.length > 0 && (
                <div
                  className={cn(
                    "text-sm grid xl:text-base gap-4 text-muted-foreground mb-8 items-center",
                    connected ? "grid-cols-7" : "grid-cols-6"
                  )}
                >
                  <div className="pl-4">Pool</div>
                  <div
                    className={cn(
                      "pl-3 flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground",
                      (sortBy === TradePoolFilterStates.LIQUIDITY_ASC ||
                        sortBy === TradePoolFilterStates.LIQUIDITY_DESC) &&
                        "text-foreground"
                    )}
                    onClick={() => {
                      setSortBy(
                        sortBy === TradePoolFilterStates.LIQUIDITY_DESC
                          ? TradePoolFilterStates.LIQUIDITY_ASC
                          : TradePoolFilterStates.LIQUIDITY_DESC
                      );
                    }}
                  >
                    {sortBy === TradePoolFilterStates.LIQUIDITY_ASC && <IconSortAscending size={16} />}
                    {sortBy === TradePoolFilterStates.LIQUIDITY_DESC && <IconSortDescending size={16} />}
                    Total Deposits
                  </div>
                  <button
                    className={cn(
                      "flex items-center gap-1 justify-end cursor-pointer transition-colors xl:justify-center xl:pr-4 hover:text-foreground",
                      (sortBy === TradePoolFilterStates.APY_ASC || sortBy === TradePoolFilterStates.APY_DESC) &&
                        "text-foreground"
                    )}
                    onClick={() => {
                      setSortBy(
                        sortBy === TradePoolFilterStates.APY_DESC
                          ? TradePoolFilterStates.APY_ASC
                          : TradePoolFilterStates.APY_DESC
                      );
                    }}
                  >
                    {sortBy === TradePoolFilterStates.APY_ASC && <IconSortAscending size={16} />}
                    {sortBy === TradePoolFilterStates.APY_DESC && <IconSortDescending size={16} />}
                    Lending APY
                  </button>
                  <div className="text-right xl:text-center">Borrow APY</div>
                  <div className="text-center">Created by</div>
                  {connected && <div>Supplied</div>}
                  <div />
                </div>
              )}
              <div>
                {filteredGroups &&
                  filteredGroups.length > 0 &&
                  filteredGroups.map((group) => {
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
                        <div
                          className={cn(
                            "grid gap-4 pt-2 pb-4 border-b items-center",
                            connected ? "grid-cols-7" : "grid-cols-6"
                          )}
                        >
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
                          <div className="flex flex-col xl:gap-2 xl:flex-row xl:items-baseline">
                            <span className="text-xl">
                              {numeralFormatter(group.pool.token.info.state.totalDeposits)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {usdFormatter.format(
                                group.pool.token.info.state.totalDeposits *
                                  group.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
                              )}
                            </span>
                          </div>

                          <div className="text-mrgn-success text-right w-32">
                            {percentFormatter.format(aprToApy(group.pool.token.info.state.lendingRate))}
                          </div>
                          <div className="text-mrgn-warning text-right w-32">
                            {percentFormatter.format(aprToApy(group.pool.token.info.state.borrowingRate))}
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
                              {group.pool.token.isActive && group.pool.token.position.isLending && (
                                <>
                                  {numeralFormatter(group.pool.token.position.amount)}
                                  <span className="text-muted-foreground text-sm">
                                    {group.pool.token.meta.tokenSymbol}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            {group.pool.token.isActive &&
                              group.pool.token.position.isLending &&
                              group.selectedAccount && (
                                <ActionBoxDialog
                                  requestedBank={group.pool.token}
                                  requestedAction={ActionType.Withdraw}
                                  requestedAccount={group.selectedAccount}
                                >
                                  <Button className="bg-background border text-foreground hover:bg-accent">
                                    Withdraw
                                  </Button>
                                </ActionBoxDialog>
                              )}
                            <ActionBoxDialog
                              requestedBank={group.pool.token}
                              requestedAction={ActionType.Deposit}
                              requestedAccount={group.marginfiAccounts[0]}
                            >
                              <Button className="bg-background border text-foreground hover:bg-accent">Supply</Button>
                            </ActionBoxDialog>
                          </div>
                        </div>
                        <div
                          className={cn("grid gap-4 pt-4 pb-2 items-center", connected ? "grid-cols-7" : "grid-cols-6")}
                          key={collateralBank.address.toBase58()}
                        >
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
                          <div className="flex flex-col xl:gap-2 xl:flex-row xl:items-baseline">
                            <span className="text-xl">{numeralFormatter(collateralBank.info.state.totalDeposits)}</span>
                            <span className="text-sm text-muted-foreground">
                              {usdFormatter.format(
                                collateralBank.info.state.totalDeposits *
                                  collateralBank.info.oraclePrice.priceRealtime.price.toNumber()
                              )}
                            </span>
                          </div>

                          <div className="text-mrgn-success text-right w-32">
                            {percentFormatter.format(aprToApy(collateralBank.info.state.lendingRate))}
                          </div>
                          <div className="text-mrgn-warning text-right w-32">
                            {percentFormatter.format(aprToApy(collateralBank.info.state.borrowingRate))}
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
                              {collateralBank.isActive && collateralBank.position.isLending && (
                                <>
                                  {numeralFormatter(collateralBank.position.amount)}
                                  <span className="text-muted-foreground text-sm">
                                    {collateralBank.meta.tokenSymbol}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            {collateralBank.isActive && collateralBank.position.isLending && group.selectedAccount && (
                              <ActionBoxDialog
                                requestedBank={collateralBank}
                                requestedAction={ActionType.Withdraw}
                                requestedAccount={group.selectedAccount}
                              >
                                <Button className="bg-background border text-foreground hover:bg-accent">
                                  Withdraw
                                </Button>
                              </ActionBoxDialog>
                            )}
                            <ActionBoxDialog
                              requestedBank={collateralBank}
                              requestedAction={ActionType.Deposit}
                              requestedAccount={group.marginfiAccounts[0]}
                            >
                              <Button className="bg-background border text-foreground hover:bg-accent">Supply</Button>
                            </ActionBoxDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="lg:hidden space-y-12">
              <div className="flex flex-col items-center">
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value as TradePoolFilterStates);
                  }}
                >
                  <SelectTrigger className="w-[190px] justify-start gap-2">
                    {dir === "desc" && <IconSortDescending size={16} />}
                    {dir === "asc" && <IconSortAscending size={16} />}
                    <SelectValue placeholder="Sort pools" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option, i) => (
                      <SelectItem key={i} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredGroups &&
                filteredGroups.length > 0 &&
                filteredGroups.map((group) => {
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
                            <span className="text-muted-foreground">Supplied</span>{" "}
                            {numeralFormatter(group.pool.token.position.amount)}{" "}
                            <span>{group.pool.token.meta.tokenSymbol}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {group.pool.token.isActive && group.pool.token.position.isLending && (
                            <ActionBoxDialog requestedBank={group.pool.token} requestedAction={ActionType.Withdraw}>
                              <Button className="w-full bg-background border text-foreground hover:bg-accent">
                                Withdraw
                              </Button>
                            </ActionBoxDialog>
                          )}
                          <ActionBoxDialog requestedBank={group.pool.token} requestedAction={ActionType.Deposit}>
                            <Button className="w-full bg-background border text-foreground hover:bg-accent">
                              Supply
                            </Button>
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
                            <span className="text-muted-foreground">Supplied</span>{" "}
                            {numeralFormatter(collateralBank.position.amount)}{" "}
                            <span>{collateralBank.meta.tokenSymbol}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {collateralBank.isActive && collateralBank.position.isLending && (
                            <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Withdraw}>
                              <Button className="w-full bg-background border text-foreground hover:bg-accent">
                                Withdraw
                              </Button>
                            </ActionBoxDialog>
                          )}
                          <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Deposit}>
                            <Button className="w-full bg-background border text-foreground hover:bg-accent">
                              Supply
                            </Button>
                          </ActionBoxDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {filteredGroups.length === 0 && search.length > 0 && (
              <div className="w-full flex items-center justify-center">
                <p>No pools found</p>
              </div>
            )}
          </>
        )}
      </div>

      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}

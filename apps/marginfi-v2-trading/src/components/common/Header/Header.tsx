"use client";

import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { motion, useAnimate } from "framer-motion";
import { IconPlus, IconCopy, IconCheck, IconSettings } from "@tabler/icons-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { cn } from "@mrgnlabs/mrgn-utils";
import { Settings } from "@mrgnlabs/mrgn-ui";

import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useIsMobile } from "~/hooks/use-is-mobile";
import { useConnection } from "~/hooks/use-connection";

import { Wallet } from "~/components/wallet-v2";
import { Button } from "~/components/ui/button";
import { IconArena } from "~/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { CreatePoolScriptDialog } from "../Pool/CreatePoolScript";
import { CreatePoolSoon } from "../Pool/CreatePoolSoon";
import { CreatePoolDialog } from "../Pool/CreatePoolDialog";

const navItems = [
  { label: "Discover", href: "/" },
  { label: "Yield", href: "/yield" },
  { label: "Portfolio", href: "/portfolio" },
];

export const Header = () => {
  const { connection } = useConnection();
  const [initialized, userDataFetched, nativeSolBalance, fetchUserData, referralCode, banksByBankPk] = useTradeStoreV2(
    (state) => [
      state.initialized,
      state.userDataFetched,
      state.nativeSolBalance,
      state.fetchUserData,
      state.referralCode,
      state.banksByBankPk,
    ]
  );
  const { priorityType, broadcastType, priorityFees, maxCap, maxCapType, setTransactionSettings } = useUiStore(
    (state) => ({
      priorityType: state.priorityType,
      broadcastType: state.broadcastType,
      priorityFees: state.priorityFees,
      maxCap: state.maxCap,
      maxCapType: state.maxCapType,
      setTransactionSettings: state.setTransactionSettings,
    })
  );
  const { wallet } = useWallet();
  const { asPath } = useRouter();
  const isMobile = useIsMobile();
  const [scope, animate] = useAnimate();

  const [isReferralCopied, setIsReferralCopied] = React.useState(false);

  const extendedBankInfos = React.useMemo(() => {
    const banks = Object.values(banksByBankPk);
    const uniqueBanksMap = new Map(banks.map((bank) => [bank.info.state.mint.toBase58(), bank]));
    const uniqueBanks = Array.from(uniqueBanksMap.values());
    console.log(uniqueBanksMap, uniqueBanks);
    return uniqueBanks;
  }, [banksByBankPk]);

  // const ownPools = React.useMemo(() => {
  //   const goups = [...groupMap.values()];
  //   return goups.filter((group) => group?.client.group.admin?.toBase58() === wallet?.publicKey?.toBase58());
  // }, [groupMap, wallet]);

  React.useEffect(() => {
    if (!initialized) return;
    animate("[data-header]", { opacity: 1, y: 0 }, { duration: 0.3, delay: 0 });
  }, [initialized, animate]);

  return (
    <div ref={scope} className="relative h-[64px]">
      <motion.header
        data-header
        className="fixed w-full flex items-center justify-between gap-8 py-3.5 px-4 bg-background z-50"
        initial={{ opacity: 0, y: -64 }}
      >
        <Link href="/">
          <IconArena size={isMobile ? 40 : 48} className="opacity-90" />
        </Link>
        <nav className="mr-auto hidden lg:block">
          <ul className="flex items-center gap-6">
            {navItems.map((item) => {
              let hrefSegment = `/${item.href.split("/")[1]}`;
              let asPathSegment = `/${asPath.split("/")[1]}`;

              if (asPathSegment === "/pools") {
                asPathSegment = "/";
              }
              return (
                <li key={item.label}>
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        asPathSegment === hrefSegment &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      {item.label}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={cn("flex items-center gap-2")}>
          {/* {ownPools.length > 0 && (
            <Link href="/admin">
              <Button variant="outline" size={isMobile ? "sm" : "default"}>
                <IconPlus size={isMobile ? 14 : 18} /> Manage pools
              </Button>
            </Link>
          )} */}
          {
            // eslint-disable-next-line turbo/no-undeclared-env-vars
            process.env.NEXT_PUBLIC_ENABLE_BANK_SCRIPT && (
              <div className="flex items-center">
                <CreatePoolScriptDialog
                  trigger={
                    <Button variant="outline" size={isMobile ? "sm" : "default"}>
                      <IconPlus size={isMobile ? 14 : 18} /> Pool Script
                    </Button>
                  }
                />
              </div>
            )
          }
          <div className="flex items-center gap-4">
            {!isMobile && (
              <div className="flex items-center">
                {/* <CreatePoolSoon /> */}
                <CreatePoolDialog
                  trigger={
                    <Button disabled={false}>
                      <IconPlus size={16} /> Create Pool
                    </Button>
                  }
                />
              </div>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                  <IconSettings size={20} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <Settings
                  onChange={(settings) => setTransactionSettings(settings, connection)}
                  broadcastType={broadcastType}
                  priorityType={priorityType}
                  maxCap={maxCap}
                  maxCapType={maxCapType}
                />
              </PopoverContent>
            </Popover>
            <Wallet
              connection={connection}
              initialized={initialized}
              userDataFetched={userDataFetched}
              extendedBankInfos={extendedBankInfos}
              nativeSolBalance={nativeSolBalance}
              refreshState={() =>
                fetchUserData({
                  connection,
                  wallet,
                })
              }
              processOpts={{
                ...priorityFees,
                broadcastType,
              }}
              headerComponent={
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <CopyToClipboard
                    text={referralCode ?? ""}
                    onCopy={() => {
                      setIsReferralCopied(true);
                      setTimeout(() => {
                        setIsReferralCopied(false);
                      }, 2000);
                    }}
                  >
                    <Button size="sm" variant="secondary" className="cursor-not-allowed opacity-75">
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger className="flex items-center gap-2 cursor-not-allowed">
                            {isReferralCopied ? (
                              <>
                                <p>Copied!</p>
                                <IconCheck size={16} />
                              </>
                            ) : (
                              <>
                                <p>Copy referrral link</p>
                                <IconCopy size={16} />
                              </>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Referral program coming soon.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Button>
                  </CopyToClipboard>
                </div>
              }
            />
          </div>
        </div>
      </motion.header>
    </div>
  );
};

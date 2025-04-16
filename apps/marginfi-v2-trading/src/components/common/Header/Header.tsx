"use client";

import React from "react";

import Link from "next/link";
import router, { useRouter } from "next/router";
import { motion, useAnimate, useScroll, useTransform } from "framer-motion";
import { IconPlus, IconCopy, IconCheck, IconSettings, IconLayoutDashboard } from "@tabler/icons-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useIsMobile } from "~/hooks/use-is-mobile";
import { useConnection } from "~/hooks/use-connection";

import { Wallet } from "~/components/wallet-v2";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Loader } from "~/components/common/Loader";
import { ResponsiveSettingsWrapper } from "~/components";
import { SearchButton } from "~/components/common/search";
import { CreatePoolDialog } from "../Pool";

const navItems = [
  { label: "Discover", href: "/" },
  { label: "Yield", href: "/yield" },
  { label: "Portfolio", href: "/portfolio" },
];

export const Header = () => {
  const { connection } = useConnection();
  const router = useRouter();
  const [initialized, userDataFetched, nativeSolBalance, fetchUserData, referralCode, banksByBankPk, groupsByGroupPk] =
    useTradeStoreV2((state) => [
      state.initialized,
      state.userDataFetched,
      state.nativeSolBalance,
      state.fetchUserData,
      state.referralCode,
      state.banksByBankPk,
      state.groupsByGroupPk,
    ]);
  const {
    priorityType,
    broadcastType,
    priorityFees,
    maxCapType,
    setTransactionSettings,
    displaySettings,
    setDisplaySettings,
    jupiterOptions,
    setJupiterOptions,
  } = useUiStore((state) => ({
    priorityType: state.priorityType,
    broadcastType: state.broadcastType,
    priorityFees: state.priorityFees,
    maxCapType: state.maxCapType,
    setTransactionSettings: state.setTransactionSettings,
    displaySettings: state.displaySettings,
    setDisplaySettings: state.setDisplaySettings,
    jupiterOptions: state.jupiterOptions,
    setJupiterOptions: state.setJupiterOptions,
  }));
  const { wallet, connected } = useWallet();
  const { asPath } = useRouter();
  const isMobile = useIsMobile();
  const [scope, animate] = useAnimate();

  // Add scroll animation
  const { scrollY } = useScroll();
  const headerBgOpacity = useTransform(scrollY, [0, 200], [0, 0.8]);

  // Convert the MotionValue to a regular state value for use in inline styles
  const [opacity, setOpacity] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = headerBgOpacity.onChange((latest) => {
      setOpacity(latest);
    });

    return () => unsubscribe();
  }, [headerBgOpacity]);

  const [isReferralCopied, setIsReferralCopied] = React.useState(false);
  const extendedBankInfos = React.useMemo(() => {
    const banks = Object.values(banksByBankPk);
    const uniqueBanksMap = new Map(banks.map((bank) => [bank.info.state.mint.toBase58(), bank]));
    const uniqueBanks = Array.from(uniqueBanksMap.values());
    return uniqueBanks;
  }, [banksByBankPk]);

  const ownedPools = React.useMemo(() => {
    const goups = Object.values(groupsByGroupPk);
    const groupsOwned = goups.filter((group) => group?.admin.toBase58() === wallet?.publicKey?.toBase58());
    return groupsOwned;
  }, [groupsByGroupPk, wallet]);

  React.useEffect(() => {
    if (!initialized) return;
    animate("[data-header]", { opacity: 1, y: 0 }, { duration: 0.3, delay: 0 });
  }, [initialized, animate]);

  return (
    <div ref={scope} className="relative h-[64px]">
      <motion.header
        data-header
        className="fixed w-full flex items-center justify-between gap-8 py-3.5 px-4 z-50"
        initial={{ opacity: 0, y: -64 }}
        style={{
          backgroundColor: `hsl(var(--background) / ${opacity})`,
          backdropFilter: "blur(2px)",
        }}
      >
        <Link href="/">
          {/* <IconArena size={isMobile ? 40 : 48} className="opacity-90" /> */}
          <Loader label={""} iconSize={isMobile ? 40 : 48} duration={6000} />
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
        <div className={cn("flex items-center gap-4")}>
          <SearchButton />
          {ownedPools.length > 0 && (
            <Link href="/admin">
              {isMobile ? (
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                  <IconLayoutDashboard size={18} />
                </Button>
              ) : (
                <Button variant="outline">
                  <IconLayoutDashboard size={18} /> Manage pools
                </Button>
              )}
            </Link>
          )}
          <div className="flex items-center gap-4">
            {!isMobile && connected && (
              <div className="flex items-center">
                {/* <CreatePoolSoon /> */}
                <CreatePoolDialog
                  trigger={
                    <Button disabled={false} variant="outline" className="text-foreground/80 hover:bg-muted">
                      <IconPlus size={16} /> Create Pool
                    </Button>
                  }
                />
              </div>
            )}
            <ResponsiveSettingsWrapper
              transactionOptions={{
                broadcastType,
                priorityType,
                maxCap: priorityFees.maxCapUi ?? 0,
                maxCapType,
              }}
              jupiterOptions={{ ...jupiterOptions, slippageBps: jupiterOptions.slippageBps / 100 }}
              onTransactionOptionsChange={(settings) => setTransactionSettings(settings, connection)}
              onJupiterOptionsChange={(settings) => setJupiterOptions(settings)}
              settingsDialogOpen={displaySettings}
              setSettingsDialogOpen={setDisplaySettings}
            >
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                <IconSettings size={20} />
              </Button>
            </ResponsiveSettingsWrapper>

            <Wallet
              connection={connection}
              initialized={initialized}
              userDataFetched={userDataFetched}
              hideActivity={true}
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

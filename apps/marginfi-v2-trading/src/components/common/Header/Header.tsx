"use client";

import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { motion, useAnimate } from "framer-motion";
import { IconTrendingUp, IconCoins, IconChartPie, IconPlus, IconShovelPitchforks } from "@tabler/icons-react";

import { useTradeStore } from "~/store";
import { cn } from "~/utils/themeUtils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useIsMobile } from "~/hooks/useIsMobile";

import { WalletButton } from "~/components/common/Wallet";
import { CreatePoolScriptDialog } from "../Pool/CreatePoolScript";
import { Button } from "~/components/ui/button";
import { IconArena } from "~/components/ui/icons";
import { CreatePoolSoon } from "../Pool/CreatePoolSoon";

const navItems = [
  { label: "pools", icon: <IconCoins />, href: "/" },
  { label: "trade", icon: <IconTrendingUp />, href: "/trade/59yr2vuW1qv3UVQx9HC6Q8mxns5S6g7fjS8YWgRgaLA7" },
  { label: "yield farming", icon: <IconShovelPitchforks />, href: "/yield" },
  { label: "portfolio", icon: <IconChartPie />, href: "/portfolio" },
];

export const Header = () => {
  const [initialized] = useTradeStore((state) => [state.initialized]);
  const { asPath, isReady } = useRouter();
  const { connected } = useWalletContext();
  const isMobile = useIsMobile();
  const [scope, animate] = useAnimate();

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
                      {React.cloneElement(item.icon, { size: 18 })}
                      {item.label}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={cn("flex items-center", process.env.NEXT_PUBLIC_ENABLE_BANK_SCRIPT && "gap-6")}>
          {
            // eslint-disable-next-line turbo/no-undeclared-env-vars
            process.env.NEXT_PUBLIC_ENABLE_BANK_SCRIPT && (
              <div className="flex items-center">
                <CreatePoolScriptDialog
                  trigger={
                    <Button variant={"secondary"} size={isMobile ? "sm" : "default"}>
                      <IconPlus size={isMobile ? 14 : 18} /> Pool Script
                    </Button>
                  }
                />
              </div>
            )
          }
          <div className="flex items-center">
            <CreatePoolSoon
              trigger={
                <Button size={isMobile ? "sm" : "default"} disabled={false}>
                  <IconPlus size={isMobile ? 14 : 18} /> Create Pools
                </Button>
              }
            />
            {/* <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button size={isMobile ? "sm" : "default"} className="opacity-50">
                      <IconPlus size={isMobile ? 14 : 18} /> Create Pools
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Permissionless pools coming soon...</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider> */}
          </div>
          <div className="ml-4">
            <WalletButton />
          </div>
        </div>
      </motion.header>
    </div>
  );
};

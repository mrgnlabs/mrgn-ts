"use client";

import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { motion, useAnimate } from "framer-motion";

import { useTradeStore } from "~/store";
import { cn } from "~/utils/themeUtils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { WalletButton } from "~/components/common/Wallet";
import { CreatePoolDialog } from "~/components/common/Pool/CreatePoolDialog";
import { Button } from "~/components/ui/button";
import { IconMrgn, IconArena, IconTrendingUp, IconCoins, IconChartPie, IconPlus } from "~/components/ui/icons";
import { useIsMobile } from "~/hooks/useIsMobile";
import { CreatePoolScriptDialog } from "../Pool/CreatePoolScript";

const navItems = [
  { label: "pools", icon: <IconCoins />, href: "/" },
  { label: "trade", icon: <IconTrendingUp />, href: "/trade/59yr2vuW1qv3UVQx9HC6Q8mxns5S6g7fjS8YWgRgaLA7" },
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
          <IconArena size={56} />
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
          {connected && !isMobile && (
            <div className="flex items-center">
              <CreatePoolDialog
                trigger={
                  <Button size={isMobile ? "sm" : "default"}>
                    <IconPlus size={isMobile ? 14 : 18} /> Create Pool
                  </Button>
                }
              />
            </div>
          )}
          <WalletButton />
        </div>
      </motion.header>
    </div>
  );
};

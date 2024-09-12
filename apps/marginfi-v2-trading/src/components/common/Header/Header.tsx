"use client";

import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { motion, useAnimate } from "framer-motion";
import { IconPlus } from "@tabler/icons-react";

import { useTradeStore } from "~/store";
import { cn } from "~/utils/themeUtils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { WalletButton } from "~/components/common/Wallet";
import { CreatePoolScriptDialog } from "../Pool/CreatePoolScript";
import { CreatePoolDialog } from "../Pool/CreatePoolDialog";
import { Button } from "~/components/ui/button";
import { IconArena } from "~/components/ui/icons";

const navItems = [
  { label: "Discover", href: "/" },
  { label: "Yield", href: "/yield" },
  { label: "Portfolio", href: "/portfolio" },
];

export const Header = () => {
  const [initialized] = useTradeStore((state) => [state.initialized]);
  const { asPath } = useRouter();
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
                    <Button variant="outline" size={isMobile ? "sm" : "default"}>
                      <IconPlus size={isMobile ? 14 : 18} /> Pool Script
                    </Button>
                  }
                />
              </div>
            )
          }
          <div className="flex items-center gap-6">
            {!isMobile && (
              <div className="flex items-center">
                <CreatePoolDialog
                  trigger={
                    <Button disabled={false}>
                      <IconPlus size={16} /> Create Pool
                    </Button>
                  }
                />
              </div>
            )}
            <WalletButton />
          </div>
        </div>
      </motion.header>
    </div>
  );
};

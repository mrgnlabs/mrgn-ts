"use client";

import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import { cn } from "~/utils/themeUtils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { WalletButton } from "~/components/common/Wallet";
import { CreatePoolDialog } from "~/components/common/Pool/CreatePoolDialog";
import { Button } from "~/components/ui/button";
import { IconMrgn, IconTrendingUp, IconCoins, IconChartPie, IconPlus } from "~/components/ui/icons";

const navItems = [
  { label: "pools", icon: <IconCoins />, href: "/" },
  { label: "trade", icon: <IconTrendingUp />, href: "/trade/59yr2vuW1qv3UVQx9HC6Q8mxns5S6g7fjS8YWgRgaLA7" },
  { label: "portfolio", icon: <IconChartPie />, href: "/portfolio" },
];

export const Header = () => {
  const { asPath, isReady } = useRouter();
  const { connected } = useWalletContext();

  return (
    <div className="relative h-[64px] mb-4 md:mb-8 lg:mb-14">
      <header className="fixed w-full flex items-center justify-between gap-8 py-3.5 px-4 bg-background z-50">
        <Link href="/">
          <IconMrgn size={31} />
        </Link>
        <nav className="mr-auto hidden lg:block">
          <ul className="flex items-center gap-6">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn("text-muted-foreground", asPath === item.href && "bg-accent text-primary")}
                  >
                    {React.cloneElement(item.icon, { size: 18 })}
                    {item.label}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-4">
          {connected && (
            <CreatePoolDialog
              trigger={
                <Button variant="secondary">
                  <IconPlus size={18} /> Create Pool
                </Button>
              }
            />
          )}
          <WalletButton />
        </div>
      </header>
    </div>
  );
};

"use client";

import React from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconTrendingUp, IconCoins, IconChartLine, IconChartPie } from "@tabler/icons-react";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/ui/logo";

const navItems = [
  { label: "trending", icon: <IconTrendingUp />, href: "/pools?sort=trending" },
  { label: "pools", icon: <IconCoins />, href: "/pools" },
  { label: "trade", icon: <IconChartLine />, href: "/trade" },
  { label: "portfolio", icon: <IconChartPie />, href: "/portfolio" },
];

export const Header = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fullPath = React.useMemo(() => {
    const search = new URLSearchParams(searchParams);
    const searchStr = search.toString();
    return `${pathname}${searchStr ? `?${searchStr}` : ""}`;
  }, [pathname, searchParams]);

  console.log(fullPath);
  return (
    <header className="flex items-center justify-between gap-8 p-4 lg:py-6 xl:px-8">
      <Link href="/">
        <Logo size={32} />
      </Link>
      <nav className="ml-auto hidden lg:block">
        <ul className="flex items-center gap-6">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>
                <Button
                  variant="ghost"
                  className={cn("text-muted-foreground", item.href === fullPath && "bg-accent text-primary")}
                >
                  {React.cloneElement(item.icon, { size: 18 })}
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Button variant="secondary" className="gap-3 px-6">
        <Logo size={16} wordmark={false} /> Sign In
      </Button>
    </header>
  );
};

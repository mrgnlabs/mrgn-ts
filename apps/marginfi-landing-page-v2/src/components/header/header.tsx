"use client";

import React from "react";

import Link from "next/link";

import { content } from "~/app/data";
import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import {
  IconMrgn,
  IconBrandXFilled,
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconMenu,
} from "~/components/ui/icons";

const navItema = content.navItems;

export const Header = () => {
  const [isScrolling, setIsScrolling] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollingStarted = scrollY > 0;

      if (scrollY && scrollingStarted) return;
      if (!scrollY && !scrollingStarted) return;

      setIsScrolling(scrollingStarted);
    };

    document.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-full py-3 px-6 transition-colors duration-500",
        isScrolling && "bg-background/90 shadow-xl"
      )}
    >
      <div className="hidden lg:flex items-center justify-between gap-4">
        <IconMrgn size={42} />
        <nav className="hidden lg:block ml-8 text-sm">
          <ul className="flex items-center gap-6">
            {navItema.map((item, index) => (
              <li key={index}>
                <Link
                  href={item.href}
                  className="border-b border-transparent transition-colors hover:border-mrgn-chartreuse"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ul className="hidden lg:flex items-center gap-6 ml-auto mr-6">
          <li>
            <Link href="#">
              <IconBrandXFilled size={20} />
            </Link>
          </li>
          <li>
            <Link href="#">
              <IconBrandDiscordFilled size={20} />
            </Link>
          </li>
          <li>
            <Link href="#">
              <IconBrandGithubFilled size={20} />
            </Link>
          </li>
        </ul>
        <Button className="hidden lg:flex">Launch App</Button>
      </div>
      <div className="flex items-center gap-4 justify-between lg:hidden">
        <IconMrgn size={34} />
        <Button variant="ghost" size="icon">
          <IconMenu />
        </Button>
      </div>
    </header>
  );
};

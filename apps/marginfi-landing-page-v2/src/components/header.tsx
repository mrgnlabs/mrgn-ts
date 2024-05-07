"use client";

import React from "react";

import Link from "next/link";

import { IconChevronDown, IconBuildingBank, IconBox, IconExternalLink, IconArrowsLeftRight } from "@tabler/icons-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useWindowSize, useDebounce } from "@uidotdev/usehooks";

import { cn } from "~/lib/utils";

import { Logo } from "~/components/ui/logo";
import { Button } from "~/components/ui/button";
import { ScrollTo } from "~/components/ui/scroll-to";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

const CONTENT = {
  navLinks: [
    { label: "Products", to: "products" },
    { label: "Ecosystem", to: "ecosystem" },
  ],
  launchLinks: [
    { label: "Lend", icon: IconBuildingBank, href: "https://app.marginfi.com" },
    { label: "Mint", icon: IconBox, href: "https://app.marginfi.com/mint" },
    { label: "Swap", icon: IconArrowsLeftRight, href: "https://app.marginfi.com/swap" },
    { label: "Launch", icon: IconExternalLink, href: "https://app.marginfi.com/" },
  ],
};

export const Header = () => {
  const [launchPopoverOpen, setLaunchPopoverOpen] = React.useState(true);
  const debouncedLaunchPopoverOpen = useDebounce(launchPopoverOpen, 200);
  const { scrollY } = useScroll();
  const { height } = useWindowSize();

  const handleMouseEnter = () => {
    setLaunchPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    setLaunchPopoverOpen(false);
  };

  const headerBackgroundColor = useTransform(
    scrollY,
    [0, height || 400],
    ["rgba(12, 14, 13, 0)", "rgba(12, 14, 13, 0.85)"]
  );

  const headerBackgroundBlur = useTransform(scrollY, [0, height ? height * 0.5 : 400], ["blur(0px)", "blur(4px)"]);

  return (
    <motion.header
      className="fixed top-0 left-0 z-30 w-screen flex items-center gap-8 p-4 pr-28"
      style={{ background: headerBackgroundColor, backdropFilter: headerBackgroundBlur }}
    >
      <Logo size={36} wordmark={true} />

      <nav className="ml-auto">
        <ul className="flex items-center gap-12">
          {CONTENT.navLinks.map((link) => (
            <li key={link.label}>
              <ScrollTo to={link.to}>
                <Button variant="ghost">{link.label}</Button>
              </ScrollTo>
            </li>
          ))}
          <li>
            <Popover open={debouncedLaunchPopoverOpen} onOpenChange={setLaunchPopoverOpen}>
              <PopoverTrigger asChild onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <div className="bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse rounded-md p-[1px]">
                  <Button
                    variant="chartreuse"
                    className={cn(debouncedLaunchPopoverOpen && "bg-background text-mrgn-chartreuse")}
                  >
                    <span
                      className={cn(
                        debouncedLaunchPopoverOpen &&
                          "bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse text-transparent bg-clip-text"
                      )}
                    >
                      Launch App
                    </span>{" "}
                    <IconChevronDown
                      size={18}
                      className={cn(
                        "ml-1 -mr-1 origin-center transition-transform",
                        debouncedLaunchPopoverOpen && "rotate-180"
                      )}
                    />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="rounded-lg px-0 py-3 bg-secondary"
                style={{
                  width: "var(--popover-width)",
                }}
                sideOffset={10}
              >
                <nav className="w-full">
                  <ul>
                    {CONTENT.launchLinks.map((link) => (
                      <li key={link.label}>
                        <Link
                          className="flex items-center gap-2 py-2 px-6 transition-colors hover:text-mrgn-chartreuse"
                          href={link.href}
                        >
                          <link.icon size={18} /> {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </PopoverContent>
            </Popover>
          </li>
        </ul>
      </nav>

      <button className="w-[72px] h-[72px] flex items-center justify-center absolute top-0 right-0 bg-secondary">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4.79999 7.60001H27.2M4.79999 16H27.2M17.4 24.4H27.2"
            stroke="white"
            strokeWidth="1.67"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </motion.header>
  );
};

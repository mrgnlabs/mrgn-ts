"use client";

import React from "react";

import Link from "next/link";

import { IconChevronUp, IconBuildingBank, IconBox, IconArrowsLeftRight, IconExternalLink } from "@tabler/icons-react";

import { cn } from "~/lib/utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";

const launchLinks = [
  { label: "Lend", icon: IconBuildingBank, href: "https://app.marginfi.com" },
  { label: "Mint", icon: IconBox, href: "https://app.marginfi.com/mint" },
  { label: "Swap", icon: IconArrowsLeftRight, href: "https://app.marginfi.com/swap" },
  { label: "Launch", icon: IconExternalLink, href: "https://app.marginfi.com/" },
];

export const LaunchButton = () => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setOpen(false);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, [setOpen]);

  return (
    <div className="flex fixed bottom-0 left-0 w-full items-center justify-center p-8 z-30 md:hidden">
      <Popover open={open} onOpenChange={(open) => setOpen(open)}>
        <PopoverTrigger asChild>
          <Button
            variant="chartreuse"
            className="gap-3 py-2.5 pl-8 pr-6 h-auto bg-opacity-50 font-medium"
            style={{
              background:
                "radial-gradient(63.36% 100% at 49.78% 100%, rgba(251,255,208,0.75) 0%, #DCE85D 53.73%, #EEFF37 100%)",
            }}
          >
            Launch App <IconChevronUp size={18} className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          style={{
            width: "var(--radix-popper-anchor-width)",
          }}
          className="bg-secondary px-0 py-3"
          side="top"
          sideOffset={10}
        >
          <nav>
            <ul>
              {launchLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="w-full">
                    <Button variant="ghost" className="gap-2 px-5 py-3 h-auto w-full justify-start">
                      <link.icon size={20} />
                      <span>{link.label}</span>
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  );
};

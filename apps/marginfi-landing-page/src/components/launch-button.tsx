"use client";

import React from "react";

import Link from "next/link";

import {
  IconChevronUp,
  IconBuildingBank,
  IconBox,
  IconArrowsLeftRight,
  IconExternalLink,
  IconX,
} from "@tabler/icons-react";
import { useWindowScroll } from "@uidotdev/usehooks";

import { cn } from "~/lib/utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";

const launchLinks = [
  { label: "Lend", icon: IconBuildingBank, href: "https://app.marginfi.com" },
  { label: "Stake", icon: IconBox, href: "https://app.marginfi.com/stake" },
  { label: "Looper", icon: IconArrowsLeftRight, href: "https://app.marginfi.com/looper" },
  { label: "Launch", icon: IconExternalLink, href: "https://app.marginfi.com/" },
];

export const LaunchButton = () => {
  const [open, setOpen] = React.useState(false);
  const [showButton, setShowButton] = React.useState(false);
  const [{ y }] = useWindowScroll();

  React.useEffect(() => {
    setOpen(false);
    if (y && y > window.innerHeight * 0.25) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  }, [y]);

  return (
    <div
      className={cn(
        "flex fixed bottom-0 left-0 w-full items-center justify-center p-6 z-30 pointer-events-none opacity-0 translate-y-16 transition-all md:hidden",
        showButton && "pointer-events-auto opacity-100 translate-y-0"
      )}
    >
      <Popover open={open} onOpenChange={(open) => setOpen(open)}>
        <PopoverTrigger asChild>
          <Button className={cn("p-0 h-auto bg-opacity-50 font-medium bg-transparent hover:bg-transparent")}>
            <div className={cn("rounded-lg", open && "p-1 bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse")}>
              <div
                className={cn(
                  "flex items-center gap-3 bg-mrgn-chartreuse py-2.5 pl-8 pr-6 rounded-md transition-colors",
                  open && "text-primary"
                )}
                style={{
                  background: open
                    ? "black"
                    : "radial-gradient(63.36% 100% at 49.78% 100%, rgba(251,255,208,0.75) 0%, #DCE85D 53.73%, #EEFF37 100%)",
                }}
              >
                Launch App
                {!open && <IconChevronUp size={18} />}
                {open && <IconX size={16} />}
              </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          style={{
            width: "var(--radix-popper-anchor-width)",
          }}
          className="bg-secondary px-0 py-3 rounded-lg"
          side="top"
          sideOffset={10}
        >
          <nav>
            <ul>
              {launchLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} target="_blank" rel="noreferrer" className="w-full">
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

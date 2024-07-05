import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useOs } from "~/hooks/useOs";
import { cn } from "~/utils/themeUtils";
import { Button } from "~/components/ui/button";

import {
  IconCoins,
  IconProps,
  IconTrendingUp,
  IconChartPie,
} from "~/components/ui/icons";

export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  Icon: (props: IconProps) => JSX.Element;
}

export const mobileLinks: NavLinkInfo[] = [
  {
    href: "/",
    alt: "pools icon",
    label: "pools",
    Icon: IconCoins,
  },
  {
    href: "/trade/59yr2vuW1qv3UVQx9HC6Q8mxns5S6g7fjS8YWgRgaLA7",
    alt: "trade icon",
    label: "trade",
    Icon: IconTrendingUp,
  },

  {
    href: "/portfolio",
    alt: "portfolio icon",
    label: "portfolio",
    Icon: IconChartPie,
  },
];

const MobileNavbar = () => {
  const { asPath, isReady } = useRouter();
  useFirebaseAccount();

  const router = useRouter();
  const [isMenuModalOpen, setIsMenuModalOpen, isActionBoxInputFocussed] = useUiStore((state) => [
    state.isMenuDrawerOpen,
    state.setIsMenuDrawerOpen,
    state.isActionBoxInputFocussed,
  ]);

  const { isIOS, isPWA } = useOs();

  const activeLink = React.useMemo(() => {
    const activeLinkIndex = mobileLinks.findIndex((link) => link.href === router.pathname);
    return activeLinkIndex >= 0 ? `link${activeLinkIndex}` : "linknone";
  }, [router.pathname]);

  if (isActionBoxInputFocussed) return null;

  return (
    <footer>
      <nav className="fixed w-full bottom-0 z-50 bg-[#0F1111]">
        <div className="h-full w-full text-xs font-normal text-[#868E95] z-50 flex justify-around relative lg:gap-8">
          {mobileLinks.map((linkInfo, index) => {
            const isActive = activeLink === `link${index}`;
            return (
              <Link
                key={linkInfo.label}
                onClick={() => linkInfo.label === "more" && setIsMenuModalOpen(true)}
                href={linkInfo.href}
                className={cn(
                  "w-1/4 py-2.5 flex flex-col gap-1 items-center border-t border-border",
                  isIOS && isPWA && "pb-8",
                  isActive ? "text-chartreuse" : "text-[#999]"
                )}
              >
                <Button
                  variant="ghost"
                  className={cn("text-muted-foreground", asPath === linkInfo.href && "bg-accent text-primary")}
                >
                  <linkInfo.Icon />
                  {linkInfo.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </nav>
    </footer>
  );
};

export { MobileNavbar };

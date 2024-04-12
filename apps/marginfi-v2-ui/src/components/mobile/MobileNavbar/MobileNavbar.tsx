import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { TablerIconsProps } from "@tabler/icons-react";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useOs } from "~/hooks/useOs";
import { cn } from "~/utils/themeUtils";

import { IconBuildingBank, IconCoinOff, IconMoneybag, IconWorld } from "~/components/ui/icons";

export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  Icon: (props: TablerIconsProps) => JSX.Element;
}

export const mobileLinks: NavLinkInfo[] = [
  {
    href: "/",
    alt: "bank icon",
    label: "lend",
    Icon: IconBuildingBank,
  },
  {
    href: "/mint",
    alt: "mint icon",
    label: "mint",
    Icon: IconCoinOff,
  },

  {
    href: "/portfolio",
    alt: "portfolio icon",
    label: "portfolio",
    Icon: IconMoneybag,
  },
  {
    href: "/ecosystem",
    alt: "world icon",
    label: "ecosystem",
    Icon: IconWorld,
  },
];

const MobileNavbar = () => {
  useFirebaseAccount();

  const router = useRouter();
  const [isMenuModalOpen, setIsMenuModalOpen, isActionBoxInputFocussed] = useUiStore((state) => [
    state.isMenuDrawerOpen,
    state.setIsMenuDrawerOpen,
    state.isActionBoxInputFocussed,
  ]);

  const { isIOS } = useOs();

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
                  isIOS && "pb-4",
                  isActive ? "text-chartreuse" : "text-[#999]"
                )}
              >
                <linkInfo.Icon />
                <div className={`font-aeonik ${isActive ? "text-[#DCE85D]" : "text-[#999]"}`}>{linkInfo.label}</div>
              </Link>
            );
          })}
        </div>
      </nav>
    </footer>
  );
};

export { MobileNavbar };

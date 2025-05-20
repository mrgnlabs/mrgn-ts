import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import {
  IconCurlyLoop,
  TablerIconsProps,
  IconBuildingBank,
  IconBox,
  IconMoneybag,
  IconWorld,
  IconHelpCircle,
  IconPlus,
  IconHelp,
} from "@tabler/icons-react";
import { cn } from "@mrgnlabs/mrgn-utils";

// import { useUiStore } from "~/store";
import { useOs } from "~/hooks/use-os";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useUiStore } from "~/store";

export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  target?: string;
  Icon: (props: TablerIconsProps) => JSX.Element;
}

export const mobileLinks: NavLinkInfo[] = [
  {
    href: "/",
    alt: "bank icon",
    label: "lend",
    Icon: IconBuildingBank,
  },
  // {
  //   href: "/stake",
  //   alt: "stake icon",
  //   label: "stake",
  //   Icon: IconBox,
  // },
  // {
  //   href: "/looper",
  //   alt: "looper icon",
  //   label: "looper",
  //   Icon: IconCurlyLoop,
  // },
  {
    href: "/portfolio",
    alt: "portfolio icon",
    label: "portfolio",
    Icon: IconMoneybag,
  },
];

const additionalLinks: NavLinkInfo[] = [
  // {
  //   href: "/ecosystem",
  //   alt: "world icon",
  //   label: "ecosystem",
  //   Icon: IconWorld,
  // },
  // {
  //   href: "https://support.marginfi.com",
  //   alt: "help icon",
  //   label: "support",
  //   target: "_blank",
  //   Icon: IconHelpCircle,
  // },
  {
    href: "https://mixin.one/codes/6530b1e8-3e81-42ab-ab65-96cbf709b771",
    alt: "help icon",
    label: "support",
    target: "_blank",
    Icon: IconHelpCircle,
  },
];

const MobileNavbar = () => {
  const router = useRouter();
  const [isMenuModalOpen, setIsMenuModalOpen] = useUiStore((state) => [
    state.isMenuDrawerOpen,
    state.setIsMenuDrawerOpen,
  ]);

  const { isIOS, isPWA } = useOs();

  const activeLink = React.useMemo(() => {
    const activeLinkIndex = mobileLinks.findIndex((link) => link.href === router.pathname);
    return activeLinkIndex >= 0 ? `link${activeLinkIndex}` : "linknone";
  }, [router.pathname]);

  return (
    <footer>
      <nav className="fixed w-full bottom-0 z-50 bg-[#0F1111]">
        <div className="h-full w-full text-xs font-normal text-[#868E95] z-50 flex justify-around relative lg:gap-8">
          {mobileLinks.map((linkInfo, index) => {
            const isActive = activeLink === `link${index}`;
            return (
              <Link
                key={linkInfo.label}
                // onClick={() => linkInfo.label === "more" && setIsMenuModalOpen(true)}
                href={linkInfo.href}
                className={cn(
                  "w-1/4 py-2.5 flex flex-col gap-1 items-center border-t border-border",
                  isIOS && isPWA && "pb-8",
                  isActive ? "text-chartreuse" : "text-[#999]"
                )}
              >
                <linkInfo.Icon />
                <div className={`font-aeonik ${isActive ? "text-[#DCE85D]" : "text-[#999]"}`}>{linkInfo.label}</div>
              </Link>
            );
          })}
          <Popover open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "group w-1/4 py-2.5 flex flex-col gap-1 items-center border-t border-border text-[#999] data-[state=open]:bg-secondary",
                  isIOS && isPWA && "pb-8"
                )}
              >
                <IconPlus className="transition-transform rotate-0 group-data-[state=open]:rotate-[225deg]" />
                More
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-fit bg-secondary" sideOffset={0}>
              <div className="grid gap-2 w-fit">
                {additionalLinks.map((linkInfo, index) => {
                  return (
                    <Link
                      key={linkInfo.label}
                      href={linkInfo.href}
                      target={linkInfo.target || "_self"}
                      className={cn("flex gap-1.5 items-center border-t border-bottom pr-8", isIOS && isPWA && "pb-8")}
                      onClick={() => setIsMenuModalOpen(false)}
                    >
                      <linkInfo.Icon size={18} />
                      <div className="text-[#999]">{linkInfo.label}</div>
                    </Link>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </nav>
    </footer>
  );
};

export { MobileNavbar };

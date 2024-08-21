import React, { ReactNode } from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { IconChartPie, IconShovelPitchforks, IconSearch, IconPlus } from "@tabler/icons-react";

import { useUiStore } from "~/store";
import { useOs } from "~/hooks/useOs";
import { cn } from "~/utils/themeUtils";

import { CreatePoolSoon } from "~/components/common/Pool/CreatePoolSoon";

export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  trigger?: (children: ReactNode) => React.JSX.Element;
  Icon: React.ElementType;
}

const CreatePoolTrigger = (children: ReactNode) => {
  return <CreatePoolSoon trigger={children} />;
};

export const mobileLinks: NavLinkInfo[] = [
  {
    href: "/",
    alt: "Discover icon",
    label: "Discover",
    Icon: IconSearch,
  },
  {
    href: "/yield",
    alt: "Yield farming icon",
    label: "Yield",
    Icon: IconShovelPitchforks,
  },
  {
    href: "/portfolio",
    alt: "Portfolio icon",
    label: "Portfolio",
    Icon: IconChartPie,
  },
  {
    href: "/",
    alt: "Create pool icon",
    label: "Create Pool",
    trigger: CreatePoolTrigger,
    Icon: IconPlus,
  },
];

const MobileNavbar = () => {
  const router = useRouter();
  const [isActionBoxInputFocussed] = useUiStore((state) => [state.isActionBoxInputFocussed]);

  const { isIOS, isPWA } = useOs();

  const activeLink = React.useMemo(() => {
    const fullLink = mobileLinks.findIndex((link) => link.href === router.pathname);
    if (fullLink > -1) return `link${fullLink}`;

    const firstSegment = router.pathname.split("/")[1];
    const firstSegmentLink = mobileLinks.findIndex((link) => link.href.includes(firstSegment));
    if (firstSegmentLink) return `link${firstSegmentLink}`;

    return "linknone";
  }, [router.pathname]);

  if (isActionBoxInputFocussed) return null;

  return (
    <footer>
      <nav
        className="fixed w-full bottom-0 z-50 bg-background border"
        style={{
          boxShadow: "0 -4px 30px 0 rgba(0, 0, 0, 0.075)",
        }}
      >
        <div className="h-full w-full text-xs font-normal z-50 flex justify-around relative lg:gap-8">
          {mobileLinks.map((linkInfo, index) => {
            const isActive = activeLink === `link${index}`;
            const trigger = linkInfo.trigger;
            const NavItem = (
              <Link
                key={linkInfo.label}
                href={linkInfo.href}
                className={cn(
                  "w-1/4 py-2.5 flex flex-col gap-1 items-center border-t border-solid border-transparent transition-colors",
                  isIOS && isPWA && "pb-8",
                  isActive ? "text-primary border-primary" : "text-muted-foreground"
                )}
              >
                <linkInfo.Icon />
                {linkInfo.label}
              </Link>
            );

            if (trigger) {
              return trigger(NavItem);
            } else {
              return NavItem;
            }
          })}
        </div>
      </nav>
    </footer>
  );
};

export { MobileNavbar };

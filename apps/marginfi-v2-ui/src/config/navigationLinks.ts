import { FC, SVGProps } from "react";
import {
  IconPieChart,
  IconReceiveMoney,
  IconTokenSwap,
  IconMore,
  IconBridge,
  IconCoins,
  IconSteak,
} from "~/components/ui/icons";
export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
}

export const ORDERED_MOBILE_NAVBAR_LINKS: NavLinkInfo[] = [
  {
    href: "/",
    alt: "hand with money icon",
    label: "lend",
    Icon: IconReceiveMoney,
  },
  {
    href: "/stake",
    alt: "steak icon",
    label: "stake",
    Icon: IconSteak,
  },

  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: IconPieChart,
  },
  {
    href: "",
    alt: "more menu icon",
    label: "more",
    Icon: IconMore,
  },
];

export const ORDERED_MOBILE_LAUNCHER_LINKS: NavLinkInfo[] = [
  {
    href: "/",
    alt: "hand with money icon",
    label: "lend",
    Icon: IconReceiveMoney,
  },
  {
    href: "/stake",
    alt: "steak icon",
    label: "stake",
    Icon: IconSteak,
  },
  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: IconPieChart,
  },
  {
    href: "/swap",
    alt: "coin swap icon",
    label: "swap",
    Icon: IconTokenSwap,
  },
  {
    href: "/bridge",
    alt: "pie chart icon",
    label: "bridge",
    Icon: IconBridge,
  },
  {
    href: "/earn",
    alt: "coins icon",
    label: "earn",
    Icon: IconCoins,
  },
];

import { FC, SVGProps } from "react";
import { PieChart, ReceiveMoney, TokenSwap, More, Bridge, Coins, Steak } from "~/components/common/icons";
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
    Icon: ReceiveMoney,
  },
  {
    href: "/stake",
    alt: "steak icon",
    label: "stake",
    Icon: Steak,
  },

  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: PieChart,
  },
  {
    href: "",
    alt: "more menu icon",
    label: "more",
    Icon: More,
  },
];

export const ORDERED_MOBILE_LAUNCHER_LINKS: NavLinkInfo[] = [
  {
    href: "/",
    alt: "hand with money icon",
    label: "lend",
    Icon: ReceiveMoney,
  },
  {
    href: "/stake",
    alt: "steak icon",
    label: "stake",
    Icon: Steak,
  },
  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: PieChart,
  },
  {
    href: "/swap",
    alt: "coin swap icon",
    label: "swap",
    Icon: TokenSwap,
  },
  {
    href: "/bridge",
    alt: "pie chart icon",
    label: "bridge",
    Icon: Bridge,
  },
  {
    href: "/earn",
    alt: "coins icon",
    label: "earn",
    Icon: Coins,
  },
  // {
  //   href: "/points",
  //   alt: "hashtag icon",
  //   label: "points",
  //   Icon: Hashtag,
  // },
];

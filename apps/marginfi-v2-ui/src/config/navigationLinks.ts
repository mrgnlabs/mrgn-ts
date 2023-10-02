import { FC, HTMLProps } from "react";
import {PieChart, ReceiveMoney, TokenSwap} from "~/components/common/icons";

export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  Icon: FC<HTMLProps<HTMLDivElement>>;
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
    alt: "coin swap icon",
    label: "stake",
    Icon: TokenSwap,
  },
  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: PieChart,
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
    alt: "coin swap icon",
    label: "stake",
    Icon: TokenSwap,
  },
  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: PieChart,
  },
];

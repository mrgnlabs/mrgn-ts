import { FC, SVGProps } from "react";
import {
  IconMore,
  IconBuildingBank,
  IconMoneybag,
  IconCoinOff,
  IconReplace,
  IconGps,
  IconBuildingBridge2,
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
    alt: "bank icon",
    label: "lend",
    Icon: IconBuildingBank,
  },
  {
    href: "/stake",
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
    Icon: IconBuildingBank,
  },
  {
    href: "/stake",
    alt: "mint icon",
    label: "mint",
    Icon: IconCoinOff,
  },
  {
    href: "/portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: IconMoneybag,
  },
  {
    href: "/swap",
    alt: "coin swap icon",
    label: "swap",
    Icon: IconReplace,
  },
  {
    href: "/bridge",
    alt: "bridge icon",
    label: "bridge",
    Icon: IconBuildingBridge2,
  },
  {
    href: "/ecosystem",
    alt: "ecosystem icon",
    label: "ecosystem",
    Icon: IconGps,
  },
];

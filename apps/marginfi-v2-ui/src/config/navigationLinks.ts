import { GitHub, QuestionMark } from "@mui/icons-material";
import { FC, SVGProps } from "react";
import { PieChart, ReceiveMoney, TokenSwap, More, Bridge, Coins, Steak } from "~/components/common/icons";
import { Discord } from "~/components/common/icons/Discord";
import TwitterIcon from "@mui/icons-material/Twitter";
import TelegramIcon from "@mui/icons-material/Telegram";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import InsightsIcon from "@mui/icons-material/Insights";

export interface NavLinkInfo {
  href: string;
  alt: string;
  label: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
}

export interface QuickLink {
  href: string;
  Icon: any;
}

export const EXTERNAL_QUICK_LINKS: QuickLink[] = [
  {
    href: "https://discord.gg/mrgn",
    Icon: Discord,
  },
  {
    href: "https://twitter.com/marginfi",
    Icon: TwitterIcon,
  },
  {
    href: "https://t.me/mrgncommunity",
    Icon: TelegramIcon,
  },
  {
    href: "https://docs.marginfi.com/",
    Icon: AutoStoriesOutlinedIcon,
  },
  {
    href: "https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m",
    Icon: InsightsIcon,
  },
  {
    href: "https://github.com/mrgnlabs",
    Icon: GitHub,
  },
  {
    href: "https://marginfi.canny.io/mrgnlend",
    Icon: QuestionMark,
  },
];

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

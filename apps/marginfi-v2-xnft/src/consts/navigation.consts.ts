import { FC, SVGProps } from "react";
import { MoreIcon, PieChartIcon, ReceiveMoneyIcon, SteakIcon, TokenSwapIcon } from "~/assets/icons";
import { DrawerMenu } from "~/components/Common/DrawerMenu";
import { LendScreen } from "~/screens/LendScreen";
import { PortfolioScreen } from "~/screens/PortfolioScreen";
import { StakeScreen } from "~/screens/StakeScreen";
import { SwapScreen } from "~/screens/SwapScreen";

export interface NavLinkInfo {
  name: string;
  alt: string;
  label: string;
  isExtra?: boolean;
  Icon: FC<SVGProps<SVGSVGElement>>;
  Comp: React.ComponentType<{}>;
}

export interface QuickLink {
  href: string;
  Icon: any;
}
// TODO
// export const EXTERNAL_QUICK_LINKS: QuickLink[] = [
//   {
//     href: "https://discord.gg/mrgn",
//     Icon: Discord,
//   },
//   {
//     href: "https://twitter.com/marginfi",
//     Icon: TwitterIcon,
//   },
//   {
//     href: "https://t.me/mrgncommunity",
//     Icon: TelegramIcon,
//   },
//   {
//     href: "https://docs.marginfi.com/",
//     Icon: AutoStoriesOutlinedIcon,
//   },
//   {
//     href: "https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m",
//     Icon: InsightsIcon,
//   },
//   {
//     href: "https://github.com/mrgnlabs",
//     Icon: GitHub,
//   },
//   {
//     href: "https://marginfi.canny.io/mrgnlend",
//     Icon: QuestionMark,
//   },
// ];

export const ORDERED_MOBILE_LAUNCHER_LINKS: NavLinkInfo[] = [
  {
    name: "Lend",
    alt: "hand with money icon",
    label: "lend",
    Icon: ReceiveMoneyIcon,
    Comp: LendScreen,
  },
  {
    name: "Stake",
    alt: "steak icon",
    label: "stake",
    Icon: SteakIcon,
    Comp: StakeScreen,
  },

  {
    name: "Portfolio",
    alt: "pie chart icon",
    label: "portfolio",
    Icon: PieChartIcon,
    Comp: PortfolioScreen,
  },
  {
    name: "Swap",
    alt: "coin swap icon",
    label: "swap",
    isExtra: true,
    Icon: TokenSwapIcon,
    Comp: SwapScreen,
  },
];

export const ORDERED_MOBILE_NAVBAR_LINKS: NavLinkInfo[] = [
  ...ORDERED_MOBILE_LAUNCHER_LINKS,
  {
    name: "More",
    alt: "more menu icon",
    label: "more",
    Icon: MoreIcon,
    Comp: DrawerMenu,
  },
];

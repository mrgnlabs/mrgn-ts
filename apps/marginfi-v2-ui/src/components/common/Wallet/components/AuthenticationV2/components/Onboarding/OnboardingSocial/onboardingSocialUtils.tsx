import * as screens from "../screens";

export type SocialOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
};

export const socialOnrampFlow: SocialOnrampScreen[] = [
  {
    comp: screens.CreateSocialAccount,
    title: "Welcome to marginfi",
    description: "and here's what we bring:",
    titleSize: "lg",
  },
  {
    comp: screens.Onramp,
    title: "Step 1. Buy some crypto",
    description: "Buy SOL with cash, you'll need this to transact on the Solana blockchain",
    titleSize: "sm",
  },
  {
    comp: screens.JupiterSwap,
    title: "Step 2. Swap some tokens",
    description: "Swap your SOL for some USDC, LST, or another token you're interested in.",
    titleSize: "sm",
  },
  {
    comp: screens.DepositToken,
    title: "Step 3. Make a deposit!",
    description: "Make your first deposit and start earning interest in marginfi.",
    titleSize: "sm",
  },
];

export const installWallet: SocialOnrampScreen = {
  comp: screens.InstallWallet,
  title: "Installing wallet",
  description: "Refresh if installed",
  titleSize: "lg",
};

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
    title: "Step 1: Create account",
    description: "and here's what we bring:",
    titleSize: "lg",
  },
  {
    comp: screens.Onramp,
    title: "Step 2: Buy some crypto",
    description: "Buy SOL with cash, you'll need this to transact on the Solana blockchain",
    titleSize: "sm",
  },
  {
    comp: screens.JupiterSwap,
    title: "Step 3: Swap some tokens",
    description: "Swap your SOL for some USDC, LST, or another token you're interested in.",
    titleSize: "sm",
  },
  {
    comp: screens.DepositToken,
    title: "Step 4: Make a deposit!",
    description: "Make your first deposit and start earning interest in marginfi.",
    titleSize: "sm",
  },
];

export const successSwap: SocialOnrampScreen = {
  comp: screens.SuccessScreen,
  title: "Swap complete",
  description: "Jupiter swap successful",
  titleSize: "sm",
};

export const installWallet: SocialOnrampScreen = {
  comp: screens.InstallWallet,
  title: "Installing wallet",
  description: "Refresh if installed",
  titleSize: "lg",
};

export const alreadyOnboarded: SocialOnrampScreen = {
  comp: screens.OnrampAlreadyExists,
  title: "Existing account detected",
  description: "View Your Positions or Continue the Onramp Process",
  titleSize: "lg",
};

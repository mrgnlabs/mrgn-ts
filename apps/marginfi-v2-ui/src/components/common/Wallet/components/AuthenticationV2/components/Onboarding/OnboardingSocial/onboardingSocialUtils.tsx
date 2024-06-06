import * as screens from "../screens";

export type SocialOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description?: string;
  titleSize: "lg" | "sm";
  tag?: string;
};

export const socialOnrampFlow: SocialOnrampScreen[] = [
  {
    comp: screens.CreateSocialAccount,
    title: "Step 1: Create account",
    description: "Sign in to download marginfi's mobile web app, or connect your existing wallet.",
    titleSize: "lg",
  },
  {
    comp: screens.Onramp,
    title: "Step 2: Buy crypto",
    description:
      "You'll need SOL to pay network validators to include your transactions. Network fees are less than a penny, but we recommend buying the amount value in SOL you want to deposit in marginfi. You can convert surplus SOL into tokens, like USDT (a stablecoin), in the next step.",
    titleSize: "sm",
    tag: "onramp",
  },
  {
    comp: screens.JupiterSwap,
    title: "Step 3: Swap your tokens",
    description:
      "Swap your tokens and start earning permissionless yield today. Make sure you keep some SOL for transaction fees.",
    titleSize: "sm",
    tag: "swap",
  },
  {
    comp: screens.DepositToken,
    title: "Step 4: Make a deposit!",
    description: "Make your first deposit into marginfi and start earning permissionless yield today.",
    titleSize: "sm",
  },
];

export const successOnramp: SocialOnrampScreen = {
  comp: screens.SuccessScreen,
  title: "Onramp complete",
  description: "Meso onramp successful",
  titleSize: "sm",
};

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
  titleSize: "lg",
};

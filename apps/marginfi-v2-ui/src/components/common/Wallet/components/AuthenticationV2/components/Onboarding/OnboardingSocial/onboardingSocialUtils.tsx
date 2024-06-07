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
    title: "Create marginfi account",
    description: "Sign in to download marginfi's mobile web app, or connect your existing wallet.",
    titleSize: "lg",
  },
  {
    comp: screens.Onramp,
    title: "Use marginfi's decentralized network",
    description:
      "You'll need SOL to pay network validators to include your transactions. Network fees are less than a penny, but we recommend buying the amount value in SOL you want to deposit in marginfi. You can convert surplus SOL into tokens, like USDT (a stablecoin), in the next step.",
    titleSize: "sm",
    tag: "onramp",
  },
  {
    comp: screens.JupiterSwap,
    title: "Diversify your holdings",
    description:
      "Swap excess SOL for other tokens you want to hold. This lets you maximize your portfolio to earn diversified, decentralized, over-collateralized yield on marginfi. Always keep some SOL for network fees.",
    titleSize: "sm",
    tag: "swap",
  },
  {
    comp: screens.DepositToken,
    title: "Make a deposit!",
    description:
      "Deposit your portfolio in marginfi to earn permissionless yield, without any middlemen, on any asset you hold. Get paid directly by borrowers, and establish collateral for your future borrowing needs.",
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

import * as screens from "../screens";

export type SocialOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
  tag?: string;
};

export const socialOnrampFlow: SocialOnrampScreen[] = [
  {
    comp: screens.CreateSocialAccount,
    title: "Step 1: Create account",
    description:
      "Sign in with email or social and we'll create a Solana wallet for you, or connect your existing Solana wallet.",
    titleSize: "lg",
  },
  {
    comp: screens.Onramp,
    title: "Step 2: Buy some crypto",
    description:
      "Buy SOL with cash. You'll need this to deposit into marginfi, swap for other tokens, and pay transaction fees. ",
    titleSize: "sm",
  },
  {
    comp: screens.JupiterSwap,
    title: "Step 3: Swap some tokens",
    description: "Swap for USDC and start earning XXX% APY today. Make sure you keep some SOL for transaction fees.",
    titleSize: "sm",
    tag: "swap",
  },
  {
    comp: screens.DepositToken,
    title: "Step 4: Make a deposit!",
    description: "Make your first deposit into marginfi and start earning XXX% APY permissionless yield today.",
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

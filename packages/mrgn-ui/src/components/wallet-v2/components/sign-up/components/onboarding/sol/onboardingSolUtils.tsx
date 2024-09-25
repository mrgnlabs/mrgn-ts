import * as screens from "../screens";

export type SolOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
  tag?: string;
};

export const solOnrampFlow: SolOnrampScreen[] = [
  {
    comp: screens.CreateSolanaAccount,
    title: "Create marginfi account",
    description: "Sign in to download marginfi's mobile web app, or connect your existing wallet.",
    titleSize: "lg",
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

export const installWallet: SolOnrampScreen = {
  comp: screens.InstallWallet,
  title: "Installing wallet",
  description: "Refresh if installed",
  titleSize: "lg",
};

export const successSwap: SolOnrampScreen = {
  comp: screens.SuccessScreen,
  title: "Swap complete!",
  description: "Your token swap was successful.",
  titleSize: "sm",
};

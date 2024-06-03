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
    title: "Step 1: Sign in",
    description: "Sign in with email or social to use the marginfi mobile web app, or connect your existing wallet.",
    titleSize: "lg",
  },
  {
    comp: screens.JupiterSwap,
    title: "Step 2. Swap some tokens",
    description: "Swap for USDC and start earning XXX% APY today. Make sure you keep some SOL for transaction fees.",
    titleSize: "sm",
    tag: "swap",
  },
  {
    comp: screens.DepositToken,
    title: "Step 3. Make a deposit!",
    description: "Make your first deposit into marginfi and start earning XXX% APY permissionless yield today.",
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
  title: "Swap complete",
  description: "Jupiter swap successful",
  titleSize: "sm",
};

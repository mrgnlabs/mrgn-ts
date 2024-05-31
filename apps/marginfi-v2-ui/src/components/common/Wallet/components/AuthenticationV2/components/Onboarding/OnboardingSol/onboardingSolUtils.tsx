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
    description: "Swap your SOL for some USDC, LST, or another token you're interested in.",
    titleSize: "sm",
    tag: "swap",
  },
  {
    comp: screens.DepositToken,
    title: "Step 3. Make a deposit!",
    description: "Make your first deposit and start earning interest in marginfi.",
    titleSize: "sm",
  },
];

export const successSwap: SolOnrampScreen = {
  comp: screens.SuccessScreen,
  title: "Swap complete",
  description: "Jupiter swap successful",
  titleSize: "sm",
};

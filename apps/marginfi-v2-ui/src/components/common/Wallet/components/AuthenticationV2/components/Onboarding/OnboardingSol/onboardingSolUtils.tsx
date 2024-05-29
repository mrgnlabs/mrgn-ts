import * as screens from "../screens";

export type SolOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
};

export const solOnrampFlow: SolOnrampScreen[] = [
  {
    comp: screens.CreateSolanaAccount,
    title: "Welcome to marginfi",
    description: "and here's what we bring:",
    titleSize: "lg",
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

import * as screens from "../screens";

export type EthOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
};

export const ethOnrampFlow: EthOnrampScreen[] = [
  {
    comp: screens.CreateEthAccount,
    title: "Step 1. Create an Account",
    description: "and here's what we bring:",
  },
  {
    comp: screens.Onramp,
    title: "Step 2. Buy some crypto",
    description: "and here's what we bring:",
  },
  {
    comp: screens.SwapToken,
    title: "Step 3. Swap some tokens",
    description: "and here's what we bring:",
  },
  {
    comp: screens.Deposit,
    title: "Step 4. Make a deposit!",
    description: "Make your first deposit and start earning interest in marginfi.",
  },
];

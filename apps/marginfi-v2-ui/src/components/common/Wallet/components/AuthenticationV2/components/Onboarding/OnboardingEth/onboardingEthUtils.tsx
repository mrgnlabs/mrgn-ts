import * as screens from "../screens";

export type EthOnrampScreen = {
  comp: React.FC<any>;
  title: string;
  description: string;
  titleSize: "lg" | "sm";
};

export const ethOnrampFlow: EthOnrampScreen[] = [
  {
    comp: screens.CreateEthAccount,
    title: "Welcome to marginfi",
    description:
      "Sign in with email or social and we'll create a Solana wallet for you, or connect an existing Solana wallet and bridge your funds.",
    titleSize: "lg",
  },
  {
    comp: screens.BridgeToken,
    title: "Step 1. Bridge your assets",
    description: "Bridge your assets from Ethereum to Solana, you can swap tokens on the next screen.",
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

export const installWallet: EthOnrampScreen = {
  comp: screens.InstallWallet,
  title: "Installing wallet",
  description: "Refresh if installed",
  titleSize: "lg",
};

export const successBridge: EthOnrampScreen = {
  comp: screens.SuccessScreen,
  title: "Bridge complete",
  description: "DeBridge bridging successful",
  titleSize: "sm",
};

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
    title: "Create marginfi account",
    description: "Sign in to download marginfi's mobile web app, or connect your existing wallet.",
    titleSize: "lg",
  },
  {
    comp: screens.BridgeToken,
    title: "Bridge your assets",
    description:
      "Move in to SOL tokens with good liquidity. Make sure you keep SOL for network fees. You can swap for other Solana assets next.",
    titleSize: "sm",
  },
  {
    comp: screens.JupiterSwap,
    title: "Diversify your holdings",
    description:
      "Swap excess SOL for x (yield), y (yield), or a different token you want to hold. This lets you maximize your portfolio to earn diversified, decentralized, over-collateralized yield on marginfi. Always keep some SOL for network fees.",
    titleSize: "sm",
  },
  {
    comp: screens.DepositToken,
    title: "Make a deposit!",
    description: "Make your first deposit into marginfi and start earning permissionless yield today.",
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

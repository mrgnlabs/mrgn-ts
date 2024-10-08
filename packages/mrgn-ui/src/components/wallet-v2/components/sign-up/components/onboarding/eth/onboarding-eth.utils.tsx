import * as screens from "~/components/wallet-v2/components/sign-up/components/onboarding/screens";

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
      "Move in to SOL tokens with good liquidity. Make sure you keep SOL for network fees. We have prefilled your new Solana wallett address below.",
    titleSize: "sm",
  },
  {
    comp: screens.JupiterSwap,
    title: "Diversify your holdings",
    description:
      "Swap excess SOL for other tokens you want to hold. This lets you maximize your portfolio to earn diversified, decentralized, over-collateralized yield on marginfi. Always keep some SOL for network fees.",
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
  description: "deBridge bridging successful",
  titleSize: "sm",
};

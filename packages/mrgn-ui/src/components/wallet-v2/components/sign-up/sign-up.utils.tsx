import { SwapResult } from "@jup-ag/common";
import { TransferCompletePayload } from "@meso-network/meso-js";
import { WalletName } from "@solana/wallet-adapter-base";
import { IconBrandX, IconBrandApple, IconBrandGoogle } from "@tabler/icons-react";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { Web3AuthSocialProvider } from "~/components/wallet-v2";
import { ExtendedWallet, QuoteResponseMeta } from "@mrgnlabs/mrgn-utils";
import {
  InAppSignIn,
  OnboardingEth,
  OnboardingMain,
  OnboardingSocial,
  OnboardingSol,
  PwaInstalation,
  ReturningUser,
  PwaSignIn,
} from "~/components/wallet-v2/components/sign-up/components";

import {
  IconPhantomWallet,
  IconBackpackWallet,
  IconSolflareWallet,
  IconBraveWallet,
  IconCoinbaseWallet,
  IconWalletConnectWallet,
  IconTrustWallet,
  IconGlowWallet,
  IconEthereum,
} from "~/components/ui/icons";
import { QuoteResponse } from "@jup-ag/api";

export type InstallingWallet = { wallet: string; flow: "eth" | "onramp" | "sol" };

export interface JupiterScreenProps {
  extendedBankInfos?: ExtendedBankInfo[];
  txid: string;
  swapResult: SwapResult;
  quoteResponseMeta: QuoteResponseMeta | null;
}

export type SuccessProps = {
  jupiterSuccess?: JupiterScreenProps;
  mesoSuccess?: TransferCompletePayload;
};
export interface OnrampScreenProps extends AuthScreenProps {
  installingWallet?: InstallingWallet;
  successProps?: SuccessProps;
  onPrev: () => void;
  onNext: () => void;
  selectWallet: (wallet: ExtendedWallet) => void;
  setSuccessProps: (props: SuccessProps) => void;
  setInstallingWallet: (wallet: InstallingWallet) => void;
}

export interface AuthScreenProps {
  userDataFetched?: boolean;
  update: (screen: AuthFlowType) => void;
  isLoading: boolean;
  flow: AuthFlowType;
  isActiveLoading: string;
  mrgnState?: {
    marginfiClient: MarginfiClient;
    selectedAccount: MarginfiAccountWrapper;
    extendedBankInfos: ExtendedBankInfo[];
    nativeSolBalance: number;
  };
  setIsActiveLoading: (isActiveLoading: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setProgress: (progress: number) => void;
  onPrev: () => void;
  onClose: () => void;
  select(walletName: WalletName | null): void;
}

type OnboardingType = "ONBOARD_MAIN" | "ONBOARD_ETH" | "ONBOARD_SOL" | "ONBOARD_SOCIAL";

type ReturningType = "RETURNING_USER" | "RETURNING_PWA";

type MobileType = "INAPP_MOBILE" | "PWA_INSTALL";

export type AuthFlowType = OnboardingType | ReturningType | MobileType;

export type AuthFlowMap = {
  [key in AuthFlowType]: {
    comp: React.FC<any>;
  };
};

export const AUTO_FLOW_MAP: AuthFlowMap = {
  ONBOARD_MAIN: {
    comp: OnboardingMain,
  },
  ONBOARD_ETH: {
    comp: OnboardingEth,
  },
  ONBOARD_SOL: {
    comp: OnboardingSol,
  },
  ONBOARD_SOCIAL: {
    comp: OnboardingSocial,
  },
  PWA_INSTALL: {
    comp: PwaInstalation,
  },
  RETURNING_USER: {
    comp: ReturningUser,
  },
  RETURNING_PWA: {
    comp: PwaSignIn,
  },
  INAPP_MOBILE: {
    comp: InAppSignIn,
  },
};

export const socialProviders: {
  name: Web3AuthSocialProvider;
  image: React.ReactNode;
}[] = [
  {
    name: "google",
    image: <IconBrandGoogle />,
  },
  {
    name: "twitter",
    image: <IconBrandX />,
  },
  {
    name: "apple",
    image: <IconBrandApple className="fill-white" />,
  },
];

// wallet login options
export const walletIcons: { [key: string]: React.ReactNode } = {
  "Brave Wallet": <IconBraveWallet size={28} />,
  "Coinbase Wallet": <IconCoinbaseWallet size={28} />,
  Phantom: <IconPhantomWallet size={28} />,
  Solflare: <IconSolflareWallet size={28} />,
  Backpack: <IconBackpackWallet size={28} />,
  WalletConnect: <IconWalletConnectWallet size={28} />,
  Glow: <IconGlowWallet size={28} />,
  Trust: <IconTrustWallet size={28} />,
  "Ethereum Wallet": <IconEthereum size={28} />,
};

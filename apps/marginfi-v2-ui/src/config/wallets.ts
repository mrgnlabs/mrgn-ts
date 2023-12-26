import { TrustWalletAdapter, WalletConnectWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export const WALLET_ADAPTERS = [
  new SolanaMobileWalletAdapter({
    addressSelector: createDefaultAddressSelector(),
    appIdentity: {
      icon: "/mrgn_logo_512.png",
      name: "marginfi",
      uri: "https://mfi.gg",
    },
    authorizationResultCache: createDefaultAuthorizationResultCache(),
    cluster: "mainnet-beta",
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  }),
  new TrustWalletAdapter(),
  new WalletConnectWalletAdapter({
    network: WalletAdapterNetwork.Mainnet,
    options: {
      relayUrl: "wss://relay.walletconnect.com",
      projectId: "b60e76594a7010d8ab8744a3d6b53a9a",
      metadata: {
        name: "marginfi",
        description: "marginfi",
        url: "https://app.marginfi.com",
        icons: ["https://app.marginfi.com/mrgn_logo_512.png"],
      },
    },
  }),
];

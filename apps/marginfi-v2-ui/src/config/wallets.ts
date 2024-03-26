import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
  WalletConnectWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { MoongateWalletAdapter } from "@moongate/moongate-adapter";
import { TipLinkWalletAdapter } from "@tiplink/wallet-adapter";

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
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TrustWalletAdapter(),
  new CoinbaseWalletAdapter(),
  new MoongateWalletAdapter(),
  new TipLinkWalletAdapter({ title: "marginfi", clientId: "ccd793db-0b13-4e18-89e1-0edf9b9dd95e", theme: "dark" }),
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

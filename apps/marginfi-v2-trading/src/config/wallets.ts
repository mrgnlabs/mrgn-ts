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
import { TipLinkWalletAdapter } from "@tiplink/wallet-adapter";

export const WALLET_ADAPTERS = [
  new SolanaMobileWalletAdapter({
    addressSelector: createDefaultAddressSelector(),
    appIdentity: {
      icon: "/icon512_maskable.png",
      name: "The Arena",
      uri: "https://www.thearena.trade",
    },
    authorizationResultCache: createDefaultAuthorizationResultCache(),
    cluster: "mainnet-beta",
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  }),
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TrustWalletAdapter(),
  new CoinbaseWalletAdapter(),
  new TipLinkWalletAdapter({ title: "arena", clientId: "ccd793db-0b13-4e18-89e1-0edf9b9dd95e", theme: "light" }),
  new WalletConnectWalletAdapter({
    network: WalletAdapterNetwork.Mainnet,
    options: {
      relayUrl: "wss://relay.walletconnect.com",
      projectId: "b60e76594a7010d8ab8744a3d6b53a9a",
      metadata: {
        name: "The Arena",
        description: "Memecoin trading, with leverage.",
        url: "https://www.thearena.trade",
        icons: ["https://www.thearena.trade/icon512_maskable.png"],
      },
    },
  }),
];

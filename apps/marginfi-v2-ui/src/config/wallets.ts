import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  GlowWalletAdapter,
  BackpackWalletAdapter,
  ExodusWalletAdapter,
  WalletConnectWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export const WALLET_ADAPTERS = [
  new BackpackWalletAdapter(),
  new ExodusWalletAdapter(),
  new GlowWalletAdapter(),
  new SolanaMobileWalletAdapter({
    addressSelector: createDefaultAddressSelector(),
    appIdentity: {
      icon: "/mrgn_logo_512.png",
      name: "marginfi",
      uri: "https://mfi.gg",
    },
    authorizationResultCache: createDefaultAuthorizationResultCache(),
    // FIXME: Find a way to toggle this when the application is set to devnet.
    cluster: "mainnet-beta",
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  }),
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TorusWalletAdapter(),
  new WalletConnectWalletAdapter({
    // TODO make network dynamic
    network: WalletAdapterNetwork.Mainnet,
    options: {
      metadata: {
        name: "marginfi",
        description: "marginfi is a decentralized lending and borrowing protocol on Solana.",
        url: "https://mfi.gg",
        icons: ["https://storage.googleapis.com/static-marginfi/mrgn_logo_512.png"],
      },
    },
  }),
];

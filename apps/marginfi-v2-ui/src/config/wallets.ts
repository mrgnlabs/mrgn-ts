import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  GlowWalletAdapter,
  BackpackWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile";

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
  new BackpackWalletAdapter(),
  new GlowWalletAdapter(),
  new TrustWalletAdapter(),
];

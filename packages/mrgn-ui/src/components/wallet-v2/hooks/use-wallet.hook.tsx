import React from "react";
import { useRouter } from "next/router";

import base58 from "bs58";
import { useCookies } from "react-cookie";
import { minidenticon } from "minidenticons";
import { useWallet as useWalletAdapter, WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_NAMESPACES, IProvider, ADAPTER_EVENTS, WALLET_ADAPTERS } from "@web3auth/base";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { SolanaWallet, SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { WalletName } from "@solana/wallet-adapter-base";

import { generateEndpoint } from "@mrgnlabs/mrgn-utils";
import type { Wallet } from "@mrgnlabs/mrgn-common";

import { useWalletStore } from "~/components/wallet-v2/store/wallet.store";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

// use-wallet.hook.tsx
// --------------------
//
// This hook provides a unified interface for wallet operations using:
// - Wallet Standard (for all compatible wallets including Phantom)
// - Web3Auth (for social login and email passwordless authentication)
//
// The Wallet Standard provides a chain-agnostic set of interfaces that standardize
// how applications interact with wallets, eliminating the need for wallet-specific code.

// Types for Web3Auth providers
type Web3AuthSocialProvider = "google" | "twitter" | "apple";
type Web3AuthProvider = "email_passwordless" | Web3AuthSocialProvider;
type WalletInfo = {
  name: WalletName | string;
  web3Auth: boolean;
  icon?: string;
  email?: string;
};

// Main wallet context properties
type WalletContextProps = {
  connecting: boolean;
  connected: boolean;
  web3AuthConnected?: boolean;
  wallet: Wallet;
  walletAddress: PublicKey;
  walletContextState: WalletContextState;
  isLoading: boolean;
  isOverride?: boolean; // Added for compatibility with existing components
  select: (walletName: WalletName | string) => void;
  loginWeb3Auth: (
    provider: string,
    extraLoginOptions?: Partial<{
      login_hint: string;
    }>,
    cb?: () => void
  ) => void;
  logout: () => void;
  requestPrivateKey: () => void;
  pfp: string;
  web3AuthPk: string;
};

// Web3Auth configuration
const web3AuthChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x1",
  rpcTarget: process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "https://mrgn.rpcpool.com/",
  displayName: "Solana Mainnet",
  blockExplorer: "https://explorer.solana.com",
  ticker: "SOL",
  tickerName: "Solana",
};

const web3authAdapterConfig =
  process.env.NEXT_PUBLIC_APP_ID === "marginfi-v2-ui"
    ? {
        appName: "marginfi",
        appUrl: "https://app.marginfi.com",
        logoDark: "https://marginfi-v2-ui-git-staging-mrgn.vercel.app/mrgn.svg",
        mode: "dark" as const,
        theme: {
          gray: "#0E1010",
        },
        useLogoLoader: true,
      }
    : {
        appName: "The Arena",
        appUrl: "https://www.thearena.trade",
        logoLight: "https://www.thearena.trade/icon.svg",
        mode: "dark" as const,
        theme: {
          gray: "#0E1010",
        },
        useLogoLoader: true,
      };

const web3AuthOpenLoginAdapterSettings = {
  uxMode: "redirect" as const,
  whiteLabel: web3authAdapterConfig,
};

// Create a custom wallet context state for Web3Auth
// This is a simplified version that works with our implementation
// We use type assertion to bypass TypeScript's strict checking
const makeCustomWalletContextState = (wallet: Wallet): WalletContextState => {
  // Create a basic implementation that matches the structure we need
  // First cast to unknown to bypass TypeScript's strict checking
  return {
    publicKey: wallet.publicKey,
    connected: true,
    connecting: false,
    disconnecting: false,

    // Methods we need to support
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
    signMessage: wallet.signMessage,

    // Basic wallet info
    wallet: {
      adapter: {
        name: "Web3Auth" as WalletName,
        publicKey: wallet.publicKey,
        connected: true,
      },
    },

    // Other required properties and methods
    wallets: [],
    autoConnect: false,
    signIn: async () => ({
      account: {
        address: wallet.publicKey.toBase58(),
        publicKey: wallet.publicKey.toBytes(),
      },
      signedMessage: new Uint8Array(0),
      signature: new Uint8Array(0),
    }),

    // Other required methods with empty implementations
    connect: async () => {},
    disconnect: async () => {},
    select: () => {},
    sendTransaction: async () => {
      throw new Error("Not implemented");
    },
  } as unknown as WalletContextState; // TODO: fix this
};

const WalletContext = React.createContext<WalletContextProps | undefined>(undefined);

const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { query, asPath, replace } = useRouter();
  const walletQueryParam = query.wallet as string;
  const [setIsWalletSignUpOpen, setIsWalletOpen] = useWalletStore((state) => [
    state.setIsWalletSignUpOpen,
    state.setIsWalletOpen,
  ]);

  const walletContextStateDefault = useWalletAdapter();
  const [walletContextState, setWalletContextState] = React.useState<WalletContextState>(walletContextStateDefault);

  const [web3Auth, setWeb3Auth] = React.useState<Web3AuthNoModal | null>(null);
  const [web3AuthWalletData, setWeb3AuthWalletData] = React.useState<Wallet | undefined>(undefined);
  const [pfp, setPfp] = React.useState<string>("");
  const [web3AuthLoginType, setWeb3AuthLoginType] = React.useState<string>("");
  const [web3AuthPk, setWeb3AuthPk] = React.useState<string>("");
  const [web3AuthEmail, setWeb3AuthEmail] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [web3AuthPkCookie, setWeb3AuthPkCookie] = useCookies(["mrgnPrivateKeyRequested"]);

  // Determine the wallet to use: web3auth or wallet adapter
  // Will check web3auth first, then walletQueryParam, then walletContextState
  const wallet: Wallet = React.useMemo(() => {
    if (web3AuthWalletData && web3Auth?.connected) {
      return web3AuthWalletData;
    }

    if (walletQueryParam) {
      return {
        publicKey: new PublicKey(walletQueryParam),
        signMessage: walletContextState.signMessage,
        signTransaction: walletContextState.signTransaction as <T extends Transaction | VersionedTransaction>(
          transaction: T
        ) => Promise<T>,
        signAllTransactions: walletContextState.signAllTransactions as <T extends Transaction | VersionedTransaction>(
          transactions: T[]
        ) => Promise<T[]>,
      };
    }

    if (walletContextState.publicKey) {
      return {
        publicKey: walletContextState.publicKey,
        signMessage: walletContextState.signMessage,
        signTransaction: walletContextState.signTransaction as <T extends Transaction | VersionedTransaction>(
          transaction: T
        ) => Promise<T>,
        signAllTransactions: walletContextState.signAllTransactions as <T extends Transaction | VersionedTransaction>(
          transactions: T[]
        ) => Promise<T[]>,
      };
    }

    return {
      publicKey: undefined,
      signMessage: undefined,
      signTransaction: undefined,
      signAllTransactions: undefined,
    } as unknown as Wallet; // TODO: does this introduce new edge case?
  }, [web3AuthWalletData, web3Auth?.connected, walletContextState, walletQueryParam]);

  // Login to web3auth with specified social provider
  const loginWeb3Auth = React.useCallback(
    async (
      provider: string,
      extraLoginOptions?: Partial<{
        login_hint: string;
      }>,
      cb?: () => void
    ) => {
      try {
        if (!web3Auth) {
          toastManager.showErrorToast("marginfi account not ready.");
          throw new Error("marginfi account not ready.");
        }
        await web3Auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
          loginProvider: provider,
          extraLoginOptions,
          mfaLevel: "none",
        });

        const walletInfo: WalletInfo = {
          name: provider as WalletName,
          web3Auth: true,
          email: extraLoginOptions && extraLoginOptions.login_hint,
        };
        localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
        localStorage.setItem("isOnboarded", "true");

        cb?.();
      } catch (error) {
        setIsWalletSignUpOpen(true);
        console.error(error);
      }
    },
    [web3Auth, setIsWalletSignUpOpen]
  );

  const logout = React.useCallback(async () => {
          await fetch("/api/user/logout", { method: "POST" });

    if (web3Auth?.connected && web3Auth) {
      await web3Auth.logout();
      setWeb3AuthWalletData(undefined);
    } else if (walletContextState.connected) {
      await walletContextState.disconnect();
    }

    if (asPath.includes("#")) {
      const newUrl = asPath.split("#")[0];
      replace(newUrl);
    }

    setIsWalletOpen(false);
    setIsLoading(false);
    setPfp("");
  }, [asPath, replace, walletContextState, web3Auth, setIsWalletOpen, setIsLoading]);

  const select = (walletName: WalletName | string) => {
    walletContextState.select(walletName as WalletName);

    if (walletContextState.wallet) {
      const walletInfo: WalletInfo = {
        name: walletName,
        icon: walletContextState.wallet.adapter.icon,
        web3Auth: false,
      };
      localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
    }
  };

  // Request private key from Web3Auth
  const requestPrivateKey = React.useCallback(async () => {
    if (!web3AuthLoginType || !web3Auth) return;
    setWeb3AuthPkCookie("mrgnPrivateKeyRequested", true, {
      expires: new Date(Date.now() + 5 * 60 * 1000),
    });
    await web3Auth.logout();
    await loginWeb3Auth(web3AuthLoginType, {
      login_hint: web3AuthLoginType === "email_passwordless" ? web3AuthEmail : undefined,
    });
  }, [web3Auth, web3AuthLoginType, web3AuthEmail, loginWeb3Auth, setWeb3AuthPkCookie]);

  // Create wallet data from Web3Auth provider
  const makeWeb3AuthWalletData = React.useCallback(
    async (web3AuthProvider: IProvider) => {
      if (!web3Auth) return;

      try {
        const solanaWallet = new SolanaWallet(web3AuthProvider);
        const accounts = await solanaWallet.requestAccounts();

        if (web3Auth.getUserInfo) {
          const userData = await web3Auth.getUserInfo();
          const loginType = userData.typeOfLogin === "jwt" ? "email_passwordless" : userData.typeOfLogin;

          setWeb3AuthLoginType(loginType!);

          fetch("/api/user/web3authlogs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              walletAddress: accounts[0],
              email: userData.email,
              loginType,
            }),
          }).catch((err) => console.error("Error logging Web3Auth login:", err));

          if (userData.email) {
            setWeb3AuthEmail(userData.email);
          }

          if (userData.profileImage) {
            setPfp(userData.profileImage);
          }
        }

        // Check if private key was requested
        if (web3AuthPkCookie.mrgnPrivateKeyRequested) {
          const privateKeyHexString = (await web3AuthProvider.request({
            method: "solanaPrivateKey",
          })) as string;
          const privateKeyBytes = new Uint8Array(
            privateKeyHexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
          );
          const privateKeyBase58 = base58.encode(privateKeyBytes);

          setWeb3AuthPkCookie("mrgnPrivateKeyRequested", false);
          setWeb3AuthPk(privateKeyBase58);
        }

        setWeb3AuthWalletData({
          publicKey: new PublicKey(accounts[0]),
          async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
            const solanaWallet = new SolanaWallet(web3AuthProvider);
            const signedTransaction = await solanaWallet.signTransaction(transaction);
            return signedTransaction;
          },
          async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
            const solanaWallet = new SolanaWallet(web3AuthProvider);
            const signedTransactions = await solanaWallet.signAllTransactions(transactions);
            return signedTransactions;
          },
          async signMessage(message: Uint8Array): Promise<Uint8Array> {
            const solanaWallet = new SolanaWallet(web3AuthProvider);
            const signedMessage = await solanaWallet.signMessage(message);
            return signedMessage;
          },
        });
      } catch (error) {
        console.error("Error creating Web3Auth wallet data:", error);
      }
    },
    [
      web3Auth,
      web3AuthPkCookie,
      setWeb3AuthPkCookie,
      setWeb3AuthLoginType,
      setWeb3AuthEmail,
      setPfp,
      setWeb3AuthPk,
      setWeb3AuthWalletData,
    ]
  );

  // Initialize Web3Auth sdk
  const initWeb3Auth = React.useCallback(async () => {
    try {
      // generate proxy rpc url
      const rpcEndpoint = await generateEndpoint(
        process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "",
        process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? ""
      );
      web3AuthChainConfig.rpcTarget = rpcEndpoint;

      const web3AuthInstance = new Web3AuthNoModal({
        clientId: process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID!,
        chainConfig: web3AuthChainConfig,
        web3AuthNetwork: "sapphire_mainnet",
      });

      const privateKeyProvider = new SolanaPrivateKeyProvider({
        config: { chainConfig: web3AuthChainConfig },
      });

      const openloginAdapter = new OpenloginAdapter({
        privateKeyProvider,
        adapterSettings: web3AuthOpenLoginAdapterSettings,
      });

      web3AuthInstance.configureAdapter(openloginAdapter);

      web3AuthInstance.on(ADAPTER_EVENTS.CONNECTED, async (provider) => {
        await makeWeb3AuthWalletData(provider);
      });

      await web3AuthInstance.init();
      setWeb3Auth(web3AuthInstance);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [makeWeb3AuthWalletData]);

  // set wallet context state depending on the wallet connection type
  React.useEffect(() => {
    // const currentInfo = JSON.parse(localStorage.getItem("walletInfo") || "{}");

    if (web3Auth?.connected && web3AuthWalletData) {
      setWalletContextState(makeCustomWalletContextState(web3AuthWalletData));
    } else if (walletContextStateDefault.connected) {
      if (walletContextStateDefault.wallet) {
        const walletInfo: WalletInfo = {
          name: walletContextStateDefault.wallet?.adapter.name,
          icon: walletContextStateDefault.wallet?.adapter.icon,
          web3Auth: false,
        };
        localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
      }
      setWalletContextState(walletContextStateDefault);
    } else {
      setWalletContextState(walletContextStateDefault);
    }

    // intentionally do not include walletContextState to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3Auth?.connected, web3AuthWalletData, walletContextStateDefault.connected]);

  // open wallet signup modal if onramp is true
  React.useEffect(() => {
    if (query.onramp) {
      setIsWalletSignUpOpen(true);
    }
  }, [query.onramp, setIsWalletSignUpOpen]);

  // if web3auth is connected, fetch wallet data
  React.useEffect(() => {
    if (!web3Auth?.connected || !web3Auth?.provider || web3AuthWalletData) return;
    setIsLoading(true);
    makeWeb3AuthWalletData(web3Auth.provider);
    setIsLoading(false);
  }, [web3Auth?.connected, web3Auth?.provider, web3AuthWalletData, makeWeb3AuthWalletData]);

  // initialize web3auth sdk on page load
  React.useEffect(() => {
    if (web3Auth) return;
    setIsLoading(true);
    initWeb3Auth();
  }, [initWeb3Auth, web3Auth]);

  // Set profile picture based on wallet
  React.useEffect(() => {
    if (web3Auth?.connected && web3AuthWalletData) {
      // Profile picture is already set by Web3Auth
    } else if (walletContextState.connected && walletContextState.publicKey) {
      // Generate identicon for wallet adapter wallets
      setPfp(
        "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(walletContextState.publicKey.toString() || "mrgn"))
      );
    }
  }, [web3Auth?.connected, web3AuthWalletData, walletContextState.connected, walletContextState.publicKey]);

  return (
    <WalletContext.Provider
      value={{
        connecting: walletContextState.connecting,
        connected: Boolean(walletContextState.connected || (web3Auth?.connected && web3AuthWalletData)),
        web3AuthConnected: Boolean(web3Auth?.connected && web3AuthWalletData),
        wallet,
        walletAddress: wallet?.publicKey as PublicKey,
        select,
        walletContextState,
        isOverride: Boolean(walletQueryParam),
        isLoading,
        loginWeb3Auth,
        logout,
        requestPrivateKey,
        pfp,
        web3AuthPk,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

const useWallet = () => {
  const context = React.useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
};

export type { Web3AuthSocialProvider, Web3AuthProvider, WalletInfo };
export { WalletProvider, useWallet };

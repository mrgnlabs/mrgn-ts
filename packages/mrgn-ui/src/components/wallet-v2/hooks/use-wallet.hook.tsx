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

import { AuthUser, createBrowserSupabaseClient, authenticate, getCurrentUser, logout as logoutUser } from "../auth";

/*
use-wallet.hook.tsx:

This hook provides a comprehensive wallet management solution for Solana applications with the following features:

1. WALLET CONNECTION MANAGEMENT:
   - Supports multiple wallet providers. Three main providers are:
      - wallet-standard compliant wallets: solflare, backpack, phantom (desktop)
      - Phantom (mobile): custom Phantom connector for mobile in-app browser (see here: https://github.com/anza-xyz/wallet-adapter/issues/814)
      - Web3Auth
   - Handles wallet connection, disconnection, and reconnection flows
   - Maintains wallet state (connected, disconnected, loading)
   - Provides transaction signing capabilities (signTransaction, signAllTransactions, signMessage)

2. CUSTOM PHANTOM INTEGRATION:
   - Direct integration with Phantom wallet via window.phantom.solana
   - Special handling ONLY FOR PHANTOM MOBILE IN WALLET BROWSER
   - Can be disabled via NEXT_PUBLIC_USE_CUSTOM_PHANTOM_CONNECTOR=false environment variable (defaults to true)
   - Everything tagged between CUSTOM PHANTOM LOGIC - START and CUSTOM PHANTOM LOGIC - END is custom Phantom logic, this will make it easy if we can eventually rip this out

3. AUTHENTICATION:
   - Integrates with Supabase for user authentication
   - Handles wallet signature-based authentication flow
   - Manages user session state
   - Can be disabled via NEXT_PUBLIC_AUTH_ENABLED=false environment variable (defaults to true)

4. WEB3AUTH INTEGRATION:
   - Supports social login options (Google, Twitter, Apple)
   - Handles email passwordless authentication
   - Manages Web3Auth wallet creation and connection
*/

// CUSTOM PHANTOM LOGIC - START
// Helper function to detect if we're in Phantom's mobile in-app browser
const isPhantomMobileInAppBrowser = (): boolean => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || "");
  const isPhantomBrowser = /Phantom/.test(navigator?.userAgent || "");

  return isMobile && isPhantomBrowser;
};

// Toggle custom Phantom connector with env var AND only on mobile in-app browser
// Default to true if the env var is not defined
const useCustomPhantomConnector =
  process.env.NEXT_PUBLIC_CUSTOM_PHANTOM_CONNECTOR !== "false" &&
  typeof window !== "undefined" &&
  isPhantomMobileInAppBrowser();

// CUSTOM PHANTOM LOGIC - END

// Types for Web3Auth
type Web3AuthSocialProvider = "google" | "twitter" | "apple";
type Web3AuthProvider = "email_passwordless" | Web3AuthSocialProvider;

type WalletInfo = {
  name: WalletName | string;
  web3Auth: boolean;
  icon?: string;
  email?: string;
};

// Main wallet context properties (exposed via WalletContext)
type WalletContextProps = {
  connecting: boolean;
  connected: boolean;
  web3AuthConnected?: boolean;
  wallet: Wallet;
  walletAddress: PublicKey;
  walletContextState: WalletContextState;
  isLoading: boolean;
  isOverride?: boolean;
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

  // Auth-related properties
  user: AuthUser | null;
  authError: Error | null;
  signatureDenied: boolean;
  authenticateUser: (args?: { referralCode?: string }) => Promise<void>;
};

// Check if authentication is enabled (defaults to true if not specified)
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

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
const makeCustomWeb3AuthWalletContextState = (wallet: Wallet): WalletContextState => {
  return {
    publicKey: wallet.publicKey,
    connected: true,
    connecting: false,
    disconnecting: false,
    wallet: {
      adapter: {
        name: "Web3Auth" as WalletName,
        publicKey: wallet.publicKey,
        connected: true,
        readyState: 1,
      },
    },
    select: () => {},
    connect: async () => {},
    disconnect: async () => {},
    sendTransaction: async () => {
      throw new Error("sendTransaction not implemented");
    },
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
    signMessage: wallet.signMessage,
  } as unknown as WalletContextState;
};

// CUSTOM PHANTOM LOGIC - START
// Create a custom wallet context state for Phantom wallet
// This ensures the wallet is properly identified as Phantom in the UI and elsewhere
const makePhantomWalletContextState = (wallet: Wallet): WalletContextState => {
  return {
    publicKey: wallet.publicKey,
    connected: true,
    connecting: false,
    disconnecting: false,
    wallet: {
      adapter: {
        name: "Phantom" as WalletName,
        icon: "/phantom.png",
        publicKey: wallet.publicKey,
        connected: true,
        readyState: 1,
      },
    },
    select: () => {},
    connect: async () => {},
    disconnect: async () => {},
    sendTransaction: async () => {
      throw new Error("sendTransaction not implemented");
    },
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
    signMessage: wallet.signMessage,
  } as unknown as WalletContextState;
};
// CUSTOM PHANTOM LOGIC - END

const supabase = createBrowserSupabaseClient();

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
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [web3AuthPkCookie, setWeb3AuthPkCookie] = useCookies(["mrgnPrivateKeyRequested"]);

  // Auth-related states
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [authError, setAuthError] = React.useState<Error | null>(null);
  const [signatureDenied, setSignatureDenied] = React.useState<boolean>(false);
  const [isAwaitingSignature, setIsAwaitingSignature] = React.useState<boolean>(false);
  const [wasLoggedOut, setWasLoggedOut] = React.useState(false);

  const isLoading = React.useMemo(() => {
    return isConnecting || isAuthenticating || walletContextStateDefault.connecting;
  }, [isConnecting, isAuthenticating, walletContextStateDefault.connecting]);

  // Determine the wallet to use: web3auth,  wallet adapter
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
    } as unknown as Wallet;
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

  // Enhanced logout method to handle both wallet disconnection and auth logout
  const logout = React.useCallback(async () => {
    await fetch("/api/user/logout", { method: "POST" });
    try {
      setWasLoggedOut(true);

      if (web3Auth?.connected && web3Auth) {
        await web3Auth.logout();
        setWeb3AuthWalletData(undefined);
      }

      // CUSTOM PHANTOM LOGIC - START
      else if (useCustomPhantomConnector && window.phantom && window?.phantom?.solana?.isConnected) {
        await window.phantom.solana.disconnect();
        // Set flag to prevent auto-reconnect
        localStorage.setItem("phantomLogout", "true");
      }
      // CUSTOM PHANTOM LOGIC - END
      else if (walletContextState.connected) {
        await walletContextState.disconnect();
      }

      if (isAuthEnabled) {
        try {
          logoutUser();
          setUser(null);
          setSignatureDenied(false);
        } catch (authErr) {
          console.error("Auth logout error:", authErr);
        }
      }

      if (asPath.includes("#")) {
        const newUrl = asPath.split("#")[0];
        replace(newUrl);
      }

      setIsWalletOpen(false);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setPfp("");
    }
  }, [asPath, replace, walletContextState, web3Auth, setIsWalletOpen]);

  const select = (walletName: WalletName | string) => {
    setWasLoggedOut(false);

    // CUSTOM PHANTOM LOGIC - START
    if (useCustomPhantomConnector && walletName === "Phantom" && window?.phantom && window?.phantom?.solana) {
      setIsConnecting(true);

      localStorage.removeItem("phantomLogout");

      window.phantom?.solana
        .connect()
        .then(() => {
          const walletInfo: WalletInfo = {
            name: "Phantom",
            icon: `/phantom.png`,
            web3Auth: false,
          };
          localStorage.setItem("walletInfo", JSON.stringify(walletInfo));

          const phantomWallet: Wallet = {
            publicKey: new PublicKey(window.phantom.solana.publicKey.toBase58()),
            signTransaction: window.phantom.solana.signTransaction,
            signAllTransactions: window.phantom.solana.signAllTransactions,
            signMessage: async (message: Uint8Array) => {
              const { signature } = await window.phantom.solana.signMessage(message);
              return signature;
            },
          };

          setWalletContextState(makePhantomWalletContextState(phantomWallet));
          setIsWalletOpen(false);
        })
        .catch((error: any) => {
          console.error("Error connecting to Phantom wallet:", error);
          toastManager.showErrorToast("Failed to connect to Phantom wallet");
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
    // CUSTOM PHANTOM LOGIC - END
    else {
      try {
        walletContextState.select(walletName as WalletName);

        if (walletContextState.wallet) {
          const walletInfo: WalletInfo = {
            name: walletName,
            icon: walletContextState.wallet.adapter.icon,
            web3Auth: false,
          };
          localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
        }
      } catch (error) {
        console.error("Error selecting wallet:", error);
      }
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
      setIsConnecting(false);
    }
  }, [makeWeb3AuthWalletData]);

  // Authenticate user with wallet
  const authenticateUser = React.useCallback(
    async (args?: { referralCode?: string }) => {
      if (!isAuthEnabled) {
        return;
      }

      if (!wallet.publicKey) {
        toastManager.showErrorToast("Wallet not connected");
        return;
      }

      setIsAuthenticating(true);
      setIsAwaitingSignature(true);

      try {
        const walletId = web3AuthWalletData ? web3AuthLoginType : undefined;

        const authResult = await authenticate(wallet, walletId, args?.referralCode);

        setIsAwaitingSignature(false);

        if (authResult.user) {
          setUser(authResult.user);
          setSignatureDenied(false);
        } else if (authResult.error) {
          const errorString = authResult.error.toLowerCase();

          if (["User rejected", "declined", "denied", "rejected", "closed"].some((str) => errorString.includes(str))) {
            setSignatureDenied(true);
            await logout();
          }

          setAuthError(new Error(String(authResult.error)));
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setAuthError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsAuthenticating(false);
      }
    },
    [wallet, web3AuthWalletData, web3AuthLoginType, logout]
  );

  // Combined auth state management - handles all auth-related effects in one place
  React.useEffect(() => {
    if (!isAuthEnabled) {
      return;
    }

    // Setup Supabase auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        getCurrentUser()
          .then(({ user, error }) => {
            if (user && !error) {
              setUser(user);
            } else if (error) {
              console.error("Auth state change error:", error);
              setAuthError(new Error(String(error)));
            }
          })
          .catch((err) => {
            console.error("Error getting user after auth state change:", err);
            setAuthError(err instanceof Error ? err : new Error(String(err)));
          });
      }
    });

    // Initial authentication check when wallet connects
    const checkAuth = async () => {
      const isWalletConnected = Boolean(walletContextState.connected || (web3Auth?.connected && web3AuthWalletData));
      if (!isWalletConnected || !wallet.publicKey || isAuthenticating || user || signatureDenied || wasLoggedOut) {
        return;
      }

      try {
        setIsAuthenticating(true);
        const { user, error } = await getCurrentUser();

        if (user && !error) {
          setUser(user);
        } else if (!signatureDenied) {
          await authenticateUser();
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setAuthError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsAuthenticating(false);
      }
    };

    checkAuth();

    const handleWalletDisconnection = async () => {
      const isWalletConnected = Boolean(walletContextState.connected || (web3Auth?.connected && web3AuthWalletData));
      if (!isWalletConnected && user) {
        try {
          const logoutResult = await logoutUser();
          if (!logoutResult.success && logoutResult.error) {
            console.error("Logout error:", logoutResult.error);
          }
          setUser(null);
        } catch (err) {
          console.error("Error during logout:", err);
        }
      }
    };

    handleWalletDisconnection();

    if (signatureDenied && wallet.publicKey) {
      logout().catch((err) => {
        console.error("Error disconnecting after signature denial:", err);
      });
    }
    if (isAwaitingSignature && !isLoading) {
      setIsConnecting(true);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [
    wallet,
    walletContextState.connected,
    web3Auth?.connected,
    web3AuthWalletData,
    user,
    isLoading,
    signatureDenied,
    isAwaitingSignature,
    authenticateUser,
    logout,
    wasLoggedOut,
    isAuthenticating,
  ]);

  // Compute connected state based on both wallet connection and authentication
  // If authentication is disabled, just return the wallet connection state
  // If signature was denied, we consider the wallet as not connected
  // When auth is enabled, only consider connected if user is authenticated
  const isConnected = React.useMemo(() => {
    const walletConnected = Boolean(walletContextState.connected || (web3Auth?.connected && web3AuthWalletData));

    if (!isAuthEnabled) {
      return walletConnected;
    }

    if (signatureDenied) {
      return false;
    }

    return walletConnected && user !== null;
  }, [walletContextState.connected, web3Auth?.connected, web3AuthWalletData, signatureDenied, user]);

  // set wallet context state depending on the wallet connection type
  React.useEffect(() => {
    if (web3Auth?.connected && web3AuthWalletData) {
      setWalletContextState(makeCustomWeb3AuthWalletContextState(web3AuthWalletData));
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3Auth?.connected, web3AuthWalletData, walletContextStateDefault.connected]);

  React.useEffect(() => {
    if (query.onramp) {
      setIsWalletSignUpOpen(true);
    }
  }, [query.onramp, setIsWalletSignUpOpen]);

  React.useEffect(() => {
    if (!web3Auth?.connected || !web3Auth?.provider || web3AuthWalletData) return;
    makeWeb3AuthWalletData(web3Auth.provider);
    setIsConnecting(false);
  }, [web3Auth?.connected, web3Auth?.provider, web3AuthWalletData, makeWeb3AuthWalletData]);

  React.useEffect(() => {
    if (web3Auth) return;
    setIsConnecting(true);
    initWeb3Auth();
  }, [initWeb3Auth, web3Auth]);

  // CUSTOM PHANTOM LOGIC - START
  // Set up Phantom wallet event handlers
  React.useEffect(() => {
    if (!useCustomPhantomConnector) return;

    if (window?.phantom && window?.phantom?.solana) {
      const handleConnect = () => {
        if (walletContextState.connected) return;

        const phantomWallet: Wallet = {
          publicKey: new PublicKey(window.phantom.solana.publicKey.toBase58()),
          signTransaction: window.phantom.solana.signTransaction,
          signAllTransactions: window.phantom.solana.signAllTransactions,
          signMessage: async (message: Uint8Array) => {
            const { signature } = await window.phantom.solana.signMessage(message);
            return signature;
          },
        };

        setWalletContextState(makePhantomWalletContextState(phantomWallet));
        window.localStorage.removeItem("phantomLogout");
      };

      const handleDisconnect = () => {
        setWalletContextState(walletContextStateDefault);
      };

      window.phantom.solana.on("connect", handleConnect);
      window.phantom.solana.on("disconnect", handleDisconnect);

      return () => {
        window.phantom.solana.removeListener("connect", handleConnect);
        window.phantom.solana.removeListener("disconnect", handleDisconnect);
      };
    }
  }, [walletContextState.connected, walletContextStateDefault]);

  // Auto-connect to Phantom if it was the last used wallet
  React.useEffect(() => {
    if (!useCustomPhantomConnector) return;

    const walletInfo = JSON.parse(localStorage.getItem("walletInfo") || "{}");

    if (
      walletInfo?.name === "Phantom" &&
      window?.phantom &&
      window?.phantom?.solana &&
      !window?.phantom?.solana?.isConnected &&
      !walletContextState.connected &&
      !window.localStorage.getItem("phantomLogout")
    ) {
      window.phantom.solana
        .connect({ onlyIfTrusted: true })
        .then(() => {
          const phantomWallet: Wallet = {
            publicKey: new PublicKey(window.phantom.solana.publicKey.toBase58()),
            signTransaction: window.phantom.solana.signTransaction,
            signAllTransactions: window.phantom.solana.signAllTransactions,
            signMessage: async (message: Uint8Array) => {
              const { signature } = await window.phantom.solana.signMessage(message);
              return signature;
            },
          };

          setWalletContextState(makePhantomWalletContextState(phantomWallet));
        })
        .catch((error: any) => {
          console.error("Auto-connect to Phantom failed:", error);
          localStorage.removeItem("walletInfo");
        });
    }
  }, [walletContextState.connected]);
  // CUSTOM PHANTOM LOGIC - END

  // Set profile picture based on wallet
  React.useEffect(() => {
    if (walletContextState.connected && walletContextState.publicKey && !pfp) {
      setPfp(
        "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(walletContextState.publicKey.toString() || "mrgn"))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3Auth?.connected, web3AuthWalletData, walletContextState.connected, walletContextState.publicKey]);

  return (
    <WalletContext.Provider
      value={{
        connecting: walletContextState.connecting,
        connected: isConnected,
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

        // Auth-related properties
        user: isAuthEnabled ? user : null,
        authError: isAuthEnabled ? authError : null,
        signatureDenied: isAuthEnabled ? signatureDenied : false,
        authenticateUser: isAuthEnabled ? authenticateUser : () => Promise.resolve(),
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

export type { Web3AuthSocialProvider, Web3AuthProvider, WalletInfo, WalletContextState as WalletContextStateOverride };
export { WalletProvider, useWallet };

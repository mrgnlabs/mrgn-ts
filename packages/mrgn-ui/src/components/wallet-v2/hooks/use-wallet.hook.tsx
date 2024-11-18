import React from "react";

import { useRouter } from "next/router";

import base58 from "bs58";
import { useCookies } from "react-cookie";
import { minidenticon } from "minidenticons";
import { useAnchorWallet, useWallet as useWalletAdapter, WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_NAMESPACES, IProvider, ADAPTER_EVENTS, WALLET_ADAPTERS } from "@web3auth/base";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { SolanaWallet, SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

import { showErrorToast, generateEndpoint } from "@mrgnlabs/mrgn-utils";
import type { Wallet } from "@mrgnlabs/mrgn-common";

import { useWalletStore } from "~/components/wallet-v2/store/wallet.store";

// use-wallet.hook.tsx
// --------------------
//
// we use a single hook to manage wallet state for the following providers:
// - wallet adapter
// - web3auth
// - phantom wallet
//
// this is useful because we return the same interface for the various providers
// and so have a single api for all wallet operations. It also allows us to
// pass wallet context to third party providers that expect a wallet adapter
//
// NOTE: we ran into issues with phantom wallet adapter using this approach
// specifically with new wallets that had not connected to the app before.
// Switching to Phantoms window.phantom.solana provider fixed this. Not ideal
// but the shared hook approach that was taken for web3auth + wallet adapater
// made it an easier refactor

// wallet adapter context type to override with web3auth / phantom wallet data
// this allows us to use a single hook for wallet adapter, web3auth, or phantom provider from the window object
type WalletContextOverride = {
  connecting: boolean;
  connected: boolean;
  icon: string;
  connect: () => void;
  disconnect: () => void;
  select: () => void;
  publicKey: PublicKey | undefined;
  signTransaction: <T extends Transaction | VersionedTransaction>(transactions: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

// wallet adapter context has a nested wallet object
type WalletContextStateOverride = {
  wallet: {
    adapter: WalletContextOverride;
  };
} & WalletContextOverride;

type WalletContextProps = {
  connecting: boolean;
  connected: boolean;
  web3AuthConncected?: boolean;
  wallet: Wallet;
  walletAddress: PublicKey;
  walletContextState: WalletContextStateOverride | WalletContextState;
  isOverride: boolean;
  isLoading: boolean;
  select: (walletName: string) => void;
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

type Web3AuthSocialProvider = "google" | "twitter" | "apple";
type Web3AuthProvider = "email_passwordless" | Web3AuthSocialProvider;
type WalletInfo = {
  name: string;
  web3Auth: boolean;
  icon?: string;
  email?: string;
};

const web3AuthChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x1",
  rpcTarget: process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "https://mrgn.rpcpool.com/",
  displayName: "Solana Mainnet",
  blockExplorer: "https://explorer.solana.com",
  ticker: "SOL",
  tickerName: "Solana",
};

const web3AuthOpenLoginAdapterSettings = {
  uxMode: "redirect",
  whiteLabel: {
    appName: "marginfi",
    appUrl: "https://app.marginfi.com",
    logoDark: "https://marginfi-v2-ui-git-staging-mrgn.vercel.app/mrgn.svg",
    mode: "dark",
    theme: {
      gray: "#0E1010",
    },
    useLogoLoader: true,
  },
} as const;

// create an object that matches wallet adapter context state
// used with web3auth and phantom wallet
const makeCustomWalletContextState = (wallet: Wallet): WalletContextStateOverride => {
  const walletProps: WalletContextOverride = {
    connected: true,
    connecting: false,
    icon: "https://app.marginfi.com/mrgn-white.svg",
    connect: () => {},
    disconnect: () => {},
    select: () => {},
    publicKey: wallet?.publicKey,
    signTransaction: wallet?.signTransaction,
    signAllTransactions: wallet?.signAllTransactions,
    signMessage: wallet?.signMessage,
  };
  return {
    ...walletProps,
    wallet: {
      adapter: {
        ...walletProps,
      },
    },
  };
};

const WalletContext = React.createContext<WalletContextProps | undefined>(undefined);

const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { query, asPath, replace } = useRouter();
  const [web3AuthPkCookie, setWeb3AuthPkCookie] = useCookies(["mrgnPrivateKeyRequested"]);
  const [setIsWalletSignUpOpen, setIsWalletOpen] = useWalletStore((state) => [
    state.setIsWalletSignUpOpen,
    state.setIsWalletOpen,
  ]);

  const walletContextStateDefault = useWalletAdapter();
  const anchorWallet = useAnchorWallet();

  const [web3Auth, setweb3Auth] = React.useState<Web3AuthNoModal | null>(null);
  const [web3AuthWalletData, setWeb3AuthWalletData] = React.useState<Wallet>();
  const [pfp, setPfp] = React.useState<string>("");
  const [web3AuthLoginType, setWeb3AuthLoginType] = React.useState<string>("");
  const [web3AuthPk, setWeb3AuthPk] = React.useState<string>("");
  const [web3AuthEmail, setWeb3AuthEmail] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [walletContextState, setWalletContextState] = React.useState<WalletContextStateOverride | WalletContextState>(
    walletContextStateDefault
  );

  // update wallet object, 3 potential sources: web3auth, anchor, override
  const { wallet, isOverride }: { wallet: Wallet; isOverride: boolean } = React.useMemo(() => {
    const override = query?.wallet as string;
    // web3auth wallet
    if (web3AuthWalletData && web3Auth?.connected) {
      return {
        wallet: web3AuthWalletData,
        isOverride: false,
      };

      // phantom wallet
    } else if (window?.phantom && window?.phantom?.solana?.isConnected) {
      return {
        wallet: {
          ...window.phantom.solana,
          publicKey: new PublicKey(window.phantom.solana.publicKey) as PublicKey,
          signMessage: window.phantom.solana.signMessage,
          signTransaction: window.phantom.solana.signTransaction,
          signAllTransactions: window.phantom.solana.signAllTransactions,
        },
        isOverride: false,
      };
    } else {
      // set identicon pfp as no pfp is available
      setPfp(
        "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(anchorWallet?.publicKey.toString() || "mrgn"))
      );

      // wallet address override
      // e.g simulating a wallet using ?wallet= query string
      if (override) {
        return {
          wallet: {
            ...anchorWallet,
            publicKey: new PublicKey(override) as PublicKey,
            signMessage: walletContextState?.signMessage,
            signTransaction: walletContextState?.signTransaction as <T extends Transaction | VersionedTransaction>(
              transactions: T
            ) => Promise<T>,
            signAllTransactions: walletContextState?.signAllTransactions as <
              T extends Transaction | VersionedTransaction
            >(
              transactions: T[]
            ) => Promise<T[]>,
          },
          isOverride: true,
        };
      }

      // wallet adapter
      return {
        wallet: {
          ...anchorWallet,
          publicKey: walletContextState.publicKey,
          signMessage: walletContextState?.signMessage,
          signTransaction: walletContextState?.signTransaction as <T extends Transaction | VersionedTransaction>(
            transactions: T
          ) => Promise<T>,
          signAllTransactions: walletContextState?.signAllTransactions as <
            T extends Transaction | VersionedTransaction
          >(
            transactions: T[]
          ) => Promise<T[]>,
        },
        isOverride: false,
      };
    }
  }, [anchorWallet, web3AuthWalletData, query, web3Auth?.connected, walletContextState]);

  // login to web3auth with specified social provider
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
          showErrorToast("marginfi account not ready.");
          throw new Error("marginfi account not ready.");
        }
        await web3Auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
          loginProvider: provider,
          extraLoginOptions,
          mfaLevel: "none",
        });

        const walletInfo: WalletInfo = {
          name: provider!,
          web3Auth: true,
          email: extraLoginOptions && extraLoginOptions.login_hint,
        };
        localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
        localStorage.setItem("isOnboarded", "true");
      } catch (error) {
        setIsWalletSignUpOpen(true);
        console.error(error);
      }
    },
    [web3Auth, setIsWalletSignUpOpen]
  );

  // logout of web3auth, phantom wallet, or  wallet adapter
  const logout = React.useCallback(async () => {
    // web3auth
    if (web3Auth?.connected && web3Auth) {
      await web3Auth.logout();
      setWeb3AuthWalletData(undefined);

      // phantom wallet
    } else if (window.phantom && window?.phantom?.solana?.isConnected) {
      await window.phantom.solana.disconnect();
      localStorage.setItem("phantomLogout", "true");

      // wallet adapter
    } else {
      await walletContextStateDefault.disconnect();
    }

    // remove hash from url (web3auth redirect)
    if (asPath.includes("#")) {
      const newUrl = asPath.split("#")[0];
      replace(newUrl);
    }

    setIsWalletOpen(false);
    setIsLoading(false);
    setPfp("");
  }, [asPath, replace, walletContextStateDefault, web3Auth, setIsWalletOpen, setIsLoading]);

  // select wallet from wallet button
  // handles both wallet adapter and phantom wallet
  // wallet adapter function is called select so intention is to keep consistent api
  const select = (walletName: string) => {
    if (walletName === "Phantom" && window?.phantom && window?.phantom?.solana) {
      window.phantom?.solana.connect();
      const walletInfo: WalletInfo = {
        name: "Phantom",
        icon: `/phantom.png`,
        web3Auth: false,
      };
      localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
    } else {
      walletContextStateDefault.select(walletName as any);
    }
  };

  // called when user requests private key
  // stores short lived cookie and forces login for additional security
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

  // if private key requested cookie is found then fetch pk, store in state, and clear cookie
  const checkPrivateKeyRequested = React.useCallback(
    async (provider: IProvider) => {
      if (!web3AuthPkCookie.mrgnPrivateKeyRequested) return;

      const privateKeyHexString = (await provider.request({
        method: "solanaPrivateKey",
      })) as string;
      const privateKeyBytes = new Uint8Array(privateKeyHexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
      const privateKeyBase58 = base58.encode(privateKeyBytes);

      setWeb3AuthPkCookie("mrgnPrivateKeyRequested", false);
      setWeb3AuthPk(privateKeyBase58);
    },
    [web3AuthPkCookie, setWeb3AuthPkCookie]
  );

  // if web3auth is connected, update wallet object
  // and override signTransaction methods with web3auth sdk
  const makeweb3AuthWalletData = React.useCallback(
    async (web3AuthProvider: IProvider) => {
      if (!web3Auth) return;

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
        });

        if (userData.email) {
          setWeb3AuthEmail(userData.email);
        }

        if (userData.profileImage) {
          setPfp(userData.profileImage);
        }
      }

      checkPrivateKeyRequested(web3AuthProvider);

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
    },
    [web3Auth, checkPrivateKeyRequested, setWeb3AuthLoginType, setWeb3AuthEmail]
  );

  // initialize web3auth sdk and phantom wallet event handlers
  const init = React.useCallback(async () => {
    try {
      // generate proxy rpc url
      const rpcEndpoint = await generateEndpoint(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "");
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
        await makeweb3AuthWalletData(provider);
      });

      if (window?.phantom && window?.phantom?.solana) {
        window.phantom.solana.on("connect", async () => {
          if (walletContextState.connected) return;
          setWalletContextState(makeCustomWalletContextState(window.phantom.solana));
          window.localStorage.removeItem("phantomLogout");
        });

        window.phantom.solana.on("disconnect", async () => {
          // if (!walletContextState.connected) return;
          setWalletContextState(walletContextStateDefault);
        });
      }

      await web3AuthInstance.init();
      setweb3Auth(web3AuthInstance);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [makeweb3AuthWalletData, walletContextStateDefault, walletContextState]);

  // set wallet context state depending on the wallet connection type
  // wallet adapter, web3auth, or phantom wallet
  React.useEffect(() => {
    // this is used to auto connect to the last connected wallet
    // and show wallet icon in the wallet button
    // here it is used to only connect phantom if it was the last connected wallet
    const currentInfo = JSON.parse(localStorage.getItem("walletInfo") || "{}");

    // web3auth wallet
    if (web3Auth?.connected && web3AuthWalletData) {
      setWalletContextState(makeCustomWalletContextState(web3AuthWalletData));

      // phantom wallet
    } else if (
      currentInfo?.name === "Phantom" &&
      window?.phantom &&
      window?.phantom?.solana &&
      !window?.phantom?.solana?.isConnected &&
      !walletContextStateDefault.connected &&
      !window.localStorage.getItem("phantomLogout")
    ) {
      // connect to phantom wallet, wallet context state is set in the phantom connect event handler
      window.phantom.solana.connect({ onlyIfTrusted: true });

      // wallet adapter
    } else if (walletContextStateDefault.connected && !window?.phantom?.solana?.isConnected) {
      if (walletContextStateDefault.wallet) {
        const walletInfo: WalletInfo = {
          name: walletContextStateDefault.wallet?.adapter.name,
          icon: walletContextStateDefault.wallet?.adapter.icon,
          web3Auth: false,
        };
        localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
      }
      setWalletContextState(walletContextStateDefault);

      // reset wallet context state to default
    } else if (!window?.phantom?.solana?.isConnected) {
      setWalletContextState(walletContextStateDefault);
    }

    // intentionally do not include walletContextStateDefault to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3Auth?.connected, web3AuthWalletData, walletContextStateDefault.connected]);

  // open wallet signup modal if onramp is true
  React.useEffect(() => {
    if (query.onramp) {
      setIsWalletSignUpOpen(true);
    }
  }, [query, setIsWalletSignUpOpen]);

  // if web3auth is connected, fetch wallet data
  React.useEffect(() => {
    if (!web3Auth?.connected || !web3Auth?.provider || web3AuthWalletData) return;
    setIsLoading(true);
    makeweb3AuthWalletData(web3Auth.provider);
    setIsLoading(false);
  }, [web3Auth?.connected, web3Auth?.provider, web3AuthWalletData, makeweb3AuthWalletData]);

  // initialize web3auth sdk on page load
  React.useEffect(() => {
    if (web3Auth) return;
    setIsLoading(true);
    init();
  }, [init, web3Auth]);

  return (
    <WalletContext.Provider
      value={{
        connecting: walletContextState?.connecting,
        connected: Boolean(walletContextState?.connected),
        web3AuthConncected: web3Auth?.connected,
        wallet,
        walletAddress: wallet?.publicKey as PublicKey,
        select,
        walletContextState,
        isOverride,
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
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};

export type { WalletContextStateOverride, Web3AuthSocialProvider, Web3AuthProvider, WalletInfo };
export { WalletProvider, useWallet };

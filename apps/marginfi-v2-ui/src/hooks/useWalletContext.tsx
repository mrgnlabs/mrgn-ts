import React from "react";

import { useRouter } from "next/router";
import { useCookies } from "react-cookie";
import { minidenticon } from "minidenticons";
import { useAnchorWallet, useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_NAMESPACES, IProvider, ADAPTER_EVENTS, WALLET_ADAPTERS } from "@web3auth/base";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { SolanaWallet, SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import base58 from "bs58";

import { showErrorToast } from "~/utils/toastUtils";
import { useUiStore } from "~/store";

import type { Wallet } from "@mrgnlabs/mrgn-common";

// wallet adapter context type to override with web3auth data
// this allows us to pass web3auth wallet to 3rd party services that expect wallet adapter
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
  sendEndpoint?: string;
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
} as const;

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

// create a wallet adapter context state from web3auth wallet
const makeweb3AuthWalletContextState = (wallet: Wallet): WalletContextStateOverride => {
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
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  // default wallet adapter context, overwritten when web3auth is connected
  let walletContextStateDefault = useWallet();
  const anchorWallet = useAnchorWallet();

  const [web3Auth, setweb3Auth] = React.useState<Web3AuthNoModal | null>(null);
  const [web3AuthWalletData, setWeb3AuthWalletData] = React.useState<Wallet>();
  const [pfp, setPfp] = React.useState<string>("");
  const [web3AuthLoginType, setWeb3AuthLoginType] = React.useState<string>("");
  const [web3AuthPk, setWeb3AuthPk] = React.useState<string>("");
  const [web3AuthEmail, setWeb3AuthEmail] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // if web3auth is connected, override wallet adapter context, otherwise use default
  const walletContextState = React.useMemo(() => {
    if (web3Auth?.connected && web3AuthWalletData) {
      return makeweb3AuthWalletContextState(web3AuthWalletData);
    } else {
      if (walletContextStateDefault.wallet) {
        const walletInfo: WalletInfo = {
          name: walletContextStateDefault.wallet.adapter.name,
          icon: walletContextStateDefault.wallet.adapter.icon,
          web3Auth: false,
        };
        localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
      }
      return walletContextStateDefault;
    }

    // intentionally do not include walletContextStateDefault
    // TODO: find a better way to handle integrating web3auth and wallet adapter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3Auth?.connected, web3AuthWalletData, walletContextStateDefault.connected]);

  // update wallet object, 3 potential sources: web3auth, anchor, override
  const { wallet, isOverride }: { wallet: Wallet | undefined; isOverride: boolean } = React.useMemo(() => {
    const override = query?.wallet as string;
    // web3auth wallet
    if (web3AuthWalletData && web3Auth?.connected) {
      return {
        wallet: web3AuthWalletData,
        isOverride: false,
      };
    } else {
      // set identicon pfp as no pfp is available
      setPfp(
        "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(anchorWallet?.publicKey.toString() || "mrgn"))
      );

      // wallet address override
      if (override) {
        return {
          wallet: {
            ...anchorWallet,
            publicKey: new PublicKey(override) as PublicKey,
            signMessage: walletContextState?.signMessage,
            signTransaction: walletContextState?.signTransaction as <T extends Transaction | VersionedTransaction>(
              transactions: T
            ) => Promise<T>,
            signAllTransactions: walletContextState?.signTransaction as <T extends Transaction | VersionedTransaction>(
              transactions: T[]
            ) => Promise<T[]>,
          },
          isOverride: true,
        };
      }

      return {
        wallet: {
          ...anchorWallet,
          publicKey: anchorWallet?.publicKey as PublicKey,
          signMessage: walletContextState?.signMessage,
          signTransaction: walletContextState?.signTransaction as <T extends Transaction | VersionedTransaction>(
            transactions: T
          ) => Promise<T>,
          signAllTransactions: walletContextState?.signTransaction as <T extends Transaction | VersionedTransaction>(
            transactions: T[]
          ) => Promise<T[]>,
        },
        isOverride: false,
      };
    }
  }, [anchorWallet, web3AuthWalletData, query, web3Auth?.connected, walletContextState]);

  // login to web3auth with specified social provider
  const loginWeb3Auth = React.useCallback(
    async (provider: string, extraLoginOptions: any = {}, cb?: () => void) => {
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
          email: extraLoginOptions.login_hint,
        };
        localStorage.setItem("walletInfo", JSON.stringify(walletInfo));
      } catch (error) {
        setIsWalletAuthDialogOpen(true);
        console.error(error);
      }
    },
    [web3Auth, setIsWalletAuthDialogOpen]
  );

  // logout of web3auth or solana wallet adapter
  const logout = React.useCallback(async () => {
    if (web3Auth?.connected && web3Auth) {
      await web3Auth.logout();
      setWeb3AuthWalletData(undefined);
    } else {
      await walletContextState?.disconnect();
    }

    if (asPath.includes("#")) {
      // Remove the hash and update the URL
      const newUrl = asPath.split("#")[0];
      replace(newUrl);
    }
    setIsLoading(false);
    setPfp("");
  }, [walletContextState, web3Auth, asPath, replace]);

  // called when user requests private key
  // stores short lived cookie and forces login
  const requestPrivateKey = React.useCallback(async () => {
    if (!web3AuthLoginType || !web3Auth) return;
    setWeb3AuthPkCookie("mrgnPrivateKeyRequested", true, { expires: new Date(Date.now() + 5 * 60 * 1000) });
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

  // if web3auth is connected, fetch wallet data
  React.useEffect(() => {
    if (!web3Auth?.connected || !web3Auth?.provider || web3AuthWalletData) return;
    setIsLoading(true);
    makeweb3AuthWalletData(web3Auth.provider);
    setIsLoading(false);
  }, [web3Auth?.connected, web3Auth?.provider, web3AuthWalletData, makeweb3AuthWalletData]);

  const init = React.useCallback(async () => {
    try {
      const web3AuthInstance = new Web3AuthNoModal({
        clientId: process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID!,
        chainConfig: web3AuthChainConfig,
        web3AuthNetwork: "sapphire_mainnet",
      });

      const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig: web3AuthChainConfig } });

      const openloginAdapter = new OpenloginAdapter({
        privateKeyProvider,
        adapterSettings: web3AuthOpenLoginAdapterSettings,
      });

      web3AuthInstance.configureAdapter(openloginAdapter);

      web3AuthInstance.on(ADAPTER_EVENTS.CONNECTED, async (provider) => {
        await makeweb3AuthWalletData(provider);
      });

      await web3AuthInstance.init();

      setweb3Auth(web3AuthInstance);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [makeweb3AuthWalletData]);

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
        walletContextState,
        isOverride,
        isLoading,
        loginWeb3Auth,
        logout,
        requestPrivateKey,
        pfp,
        web3AuthPk,
        sendEndpoint: process.env.NEXT_PUBLIC_MARGINFI_SEND_RPC_ENDPOINT_OVERRIDE,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

const useWalletContext = () => {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};

export type { WalletContextStateOverride, Web3AuthSocialProvider, Web3AuthProvider, WalletInfo };
export { WalletProvider, useWalletContext };

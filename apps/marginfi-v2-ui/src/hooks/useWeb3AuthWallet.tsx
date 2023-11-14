import React from "react";
import { useCookies } from "react-cookie";
import { WALLET_ADAPTERS } from "@web3auth/base";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_NAMESPACES, IProvider, ADAPTER_EVENTS } from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { SolanaWallet, SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { toast } from "react-toastify";

export type Web3AuthSocialProvider = "google" | "twitter" | "apple";
export type Web3AuthProvider = "email_passwordless" | Web3AuthSocialProvider;

type Web3AuthContextProps = {
  walletData: Wallet | undefined;
  connected: boolean;
  isMoonPayActive: boolean;
  setIsMoonPayActive: (active: boolean) => void;
  isOpenWallet: boolean;
  setIsOpenWallet: (open: boolean) => void;
  login: (
    provider: Web3AuthProvider,
    extraLoginOptions?: Partial<{
      login_hint: string;
    }>,
    cb?: () => void
  ) => void;
  logout: () => void;
  pfp: string;
  pk: string;
  resetPk: () => void;
  requestPrivateKey: () => void;
};

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x1",
  rpcTarget: process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "https://mrgn.rpcpool.com/",
  displayName: "Solana Mainnet",
  blockExplorer: "https://explorer.solana.com",
  ticker: "SOL",
  tickerName: "Solana",
};

const Web3AuthContext = React.createContext<Web3AuthContextProps | undefined>(undefined);

export const Web3AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [pkCookie, setPkCookie] = useCookies(["privateKeyRequested"]);
  const [walletData, setWalletData] = React.useState<Wallet>();
  const [web3auth, setWeb3auth] = React.useState<Web3AuthNoModal | null>(null);
  const [web3authProvider, setWeb3authProvider] = React.useState<IProvider | null>(null);
  const [isMoonPayActive, setIsMoonPayActive] = React.useState<boolean>(false);
  const [isOpenWallet, setIsOpenWallet] = React.useState<boolean>(false);
  const [pfp, setPfp] = React.useState<string>("");
  const [pk, setPk] = React.useState<string>("");
  const [loginType, setLoginType] = React.useState<string>("");
  const [privateKeyRequested, setPrivateKeyRequested] = React.useState<boolean>(false);

  const logout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setWalletData(undefined);
    setWeb3authProvider(null);
    setPfp("");
  };

  const login = async (provider: string, extraLoginOptions: any = {}, cb?: () => void) => {
    if (!web3auth) {
      toast.error("Error connecting to Web3Auth");
      return;
    }

    try {
      await web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
        loginProvider: provider,
        extraLoginOptions,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const makeWeb3AuthWalletData = async (web3authProvider: IProvider) => {
    if (!web3auth) return;

    const solanaWallet = new SolanaWallet(web3authProvider);
    const accounts = await solanaWallet.requestAccounts();

    if (web3auth.getUserInfo) {
      const userData = await web3auth.getUserInfo();
      setLoginType(userData.typeOfLogin || "");
      setPfp(userData.profileImage || "");
    }

    checkPrivateKeyRequested(web3authProvider);

    setWeb3authProvider(web3authProvider);
    setWalletData({
      publicKey: new PublicKey(accounts[0]),
      async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        const solanaWallet = new SolanaWallet(web3authProvider);
        const signedTransaction = await solanaWallet.signTransaction(transaction);
        return signedTransaction;
      },
      async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        const solanaWallet = new SolanaWallet(web3authProvider);
        const signedTransactions = await solanaWallet.signAllTransactions(transactions);
        return signedTransactions;
      },
      async signMessage(message: Uint8Array): Promise<Uint8Array> {
        const solanaWallet = new SolanaWallet(web3authProvider);
        const signedMessage = await solanaWallet.signMessage(message);
        return signedMessage;
      },
    });
  };

  const requestPrivateKey = async () => {
    if (!loginType) return;
    setPkCookie("privateKeyRequested", true, { expires: new Date(Date.now() + 5 * 60 * 1000) });
    await logout();
    await login(loginType);
  };

  const checkPrivateKeyRequested = async (provider: IProvider) => {
    if (!pkCookie.privateKeyRequested) return;

    const pk = await provider.request({
      method: "solanaPrivateKey",
    });

    setPkCookie("privateKeyRequested", false);
    setPk(pk as string);
  };

  const resetPk = () => {
    setPk("");
  };

  React.useEffect(() => {
    if (!web3auth || !web3auth.connected || !web3auth.provider || walletData) return;
    makeWeb3AuthWalletData(web3auth.provider);
  }, [web3auth, walletData]);

  React.useEffect(() => {
    const init = async () => {
      try {
        const web3authInstance = new Web3AuthNoModal({
          clientId: process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID || "",
          chainConfig,
          web3AuthNetwork: "sapphire_mainnet",
        });

        const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig } });

        const openloginAdapter = new OpenloginAdapter({
          privateKeyProvider,
          adapterSettings: {
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
          },
        });

        web3authInstance.configureAdapter(openloginAdapter);

        web3authInstance.on(ADAPTER_EVENTS.CONNECTED, async (provider) => {
          await makeWeb3AuthWalletData(provider);
        });

        await web3authInstance.init();

        setWeb3auth(web3authInstance);
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  return (
    <Web3AuthContext.Provider
      value={{
        isOpenWallet,
        setIsOpenWallet,
        isMoonPayActive,
        setIsMoonPayActive,
        walletData,
        connected: Boolean(web3auth?.connected),
        login,
        logout,
        requestPrivateKey,
        pfp,
        pk,
        resetPk,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
};

export const useWeb3AuthWallet = () => {
  const context = React.useContext(Web3AuthContext);
  if (!context) {
    throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
  }
  return context;
};

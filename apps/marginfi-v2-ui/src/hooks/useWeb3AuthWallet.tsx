import React from "react";
import { WALLET_ADAPTERS } from "@web3auth/base";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_NAMESPACES, IProvider } from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { SolanaWallet, SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { toast } from "react-toastify";

export type Web3AuthSocialProvider = "google" | "twitter" | "apple";

type Web3AuthContextProps = {
  walletData: Wallet | undefined;
  connected: boolean;
  isOpenAuthDialog: boolean;
  setIsOpenAuthDialog: (open: boolean) => void;
  login: (
    provider: "email_passwordless" | Web3AuthSocialProvider,
    extraLoginOptions?: Partial<{
      login_hint: string;
    }>
  ) => void;
  logout: () => void;
};

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x1",
  rpcTarget: process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || '"https://mrgn.rpcpool.com/',
  displayName: "Solana Mainnet",
  blockExplorer: "https://explorer.solana.com",
  ticker: "SOL",
  tickerName: "Solana",
};

const Web3AuthContext = React.createContext<Web3AuthContextProps | undefined>(undefined);

export const Web3AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [walletData, setWalletData] = React.useState<Wallet>();
  const [web3auth, setWeb3auth] = React.useState<Web3AuthNoModal | null>(null);
  const [isOpenAuthDialog, setIsOpenAuthDialog] = React.useState<boolean>(false);

  const logout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setWalletData(undefined);
  };

  const login = async (provider: string, extraLoginOptions: any = {}) => {
    if (!web3auth) return;

    try {
      const web3authProvider = await web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
        loginProvider: provider,
        extraLoginOptions,
      });

      if (!web3authProvider) {
        toast.error("Error connecting to Web3Auth");
        return;
      }

      makeWeb3AuthWalletData(web3authProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const makeWeb3AuthWalletData = async (web3authProvider: IProvider) => {
    const solanaWallet = new SolanaWallet(web3authProvider);
    const accounts = await solanaWallet.requestAccounts();

    console.log("Connected public key", accounts[0]);

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
    });
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
          web3AuthNetwork: "sapphire_devnet",
        });

        const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig } });

        const openloginAdapter = new OpenloginAdapter({
          privateKeyProvider,
          adapterSettings: {
            uxMode: "redirect",
          },
        });

        web3authInstance.configureAdapter(openloginAdapter);
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
        isOpenAuthDialog,
        setIsOpenAuthDialog,
        walletData,
        connected: Boolean(web3auth?.connected),
        login,
        logout,
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

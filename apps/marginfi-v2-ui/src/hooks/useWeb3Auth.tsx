import React from "react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { Web3Auth } from "@web3auth/modal";
import { SolanaWallet } from "@web3auth/solana-provider";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { toast } from "react-toastify";

// Define the context
interface Web3AuthContextProps {
  web3AuthWalletData: Wallet | undefined;
  showAuthModal: () => Promise<void>;
  logout: () => void;
}

const Web3AuthContext = React.createContext<Web3AuthContextProps | undefined>(undefined);

export const Web3AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [web3AuthWalletData, setWeb3AuthWalletData] = React.useState<Wallet>();
  const [web3auth, setWeb3auth] = React.useState<Web3Auth | null>(null);

  const showAuthModal = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }

    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      toast.error("Error connecting to Web3Auth");
      return;
    }

    const solanaWallet = new SolanaWallet(web3authProvider);
    const accounts = await solanaWallet.requestAccounts();

    console.log("Connected public key", accounts[0]);

    setWeb3AuthWalletData({
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

  const logout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setWeb3AuthWalletData(undefined);
  };

  React.useEffect(() => {
    const init = async () => {
      try {
        const web3authInstance = new Web3Auth({
          clientId: process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID || "",
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.SOLANA,
            chainId: "0x1",
            rpcTarget: process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || '"https://mrgn.rpcpool.com/', // This is the public RPC we have added, please pass on your own endpoint while creating an app
          },
          web3AuthNetwork: "sapphire_devnet",
        });

        setWeb3auth(web3authInstance);
        await web3authInstance.initModal();
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  return (
    <Web3AuthContext.Provider value={{ web3AuthWalletData, showAuthModal, logout }}>
      {children}
    </Web3AuthContext.Provider>
  );
};

export const useWeb3Auth = () => {
  const context = React.useContext(Web3AuthContext);
  if (!context) {
    throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
  }
  return context;
};

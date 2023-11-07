import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { useWeb3AuthWallet } from "./useWeb3AuthWallet";

const useWalletContext = () => {
  const walletContextState = useWallet();
  const anchorWallet = useAnchorWallet();
  const {
    walletData: web3AuthWalletData,
    connected: web3AuthConnected,
    login: web3AuthLogin,
    logout: web3AuthLogout,
  } = useWeb3AuthWallet();
  const { query } = useRouter();

  const { wallet, isOverride }: { wallet: Wallet | undefined; isOverride: boolean } = useMemo(() => {
    const override = query?.wallet as string;
    if (web3AuthWalletData && web3AuthConnected) {
      return {
        wallet: web3AuthWalletData,
        isOverride: false,
      };
    } else if (anchorWallet && override) {
      return {
        wallet: {
          ...anchorWallet,
          publicKey: new PublicKey(override) as PublicKey,
          signMessage: walletContextState.signMessage,
          signTransaction: walletContextState.signTransaction as <T extends Transaction | VersionedTransaction>(
            transactions: T
          ) => Promise<T>,
          signAllTransactions: walletContextState.signTransaction as <T extends Transaction | VersionedTransaction>(
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
        signMessage: walletContextState.signMessage,
        signTransaction: walletContextState.signTransaction as <T extends Transaction | VersionedTransaction>(
          transactions: T
        ) => Promise<T>,
        signAllTransactions: walletContextState.signTransaction as <T extends Transaction | VersionedTransaction>(
          transactions: T[]
        ) => Promise<T[]>,
      },
      isOverride: false,
    };
  }, [anchorWallet, web3AuthWalletData, query]);

  const logout = useCallback(() => {
    if (web3AuthConnected) {
      web3AuthLogout();
    } else {
      walletContextState.disconnect();
    }
  }, [walletContextState, web3AuthConnected, web3AuthLogout]);

  return {
    wallet,
    walletAddress: wallet?.publicKey,
    isOverride,
    connected: walletContextState.connected || web3AuthConnected,
    connecting: walletContextState.connecting,
    walletContextState,
    login: web3AuthLogin,
    logout,
  };
};

export { useWalletContext };

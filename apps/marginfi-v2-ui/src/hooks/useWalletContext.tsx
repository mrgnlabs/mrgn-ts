import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet, useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
import { useWeb3AuthWallet } from "./useWeb3AuthWallet";

type WalletContextOveride = {
  connected: boolean;
  connecting: boolean;
  icon: string;
  disconnect: () => void;
  select: () => void;
  publicKey: PublicKey | undefined;
  signTransaction: <T extends Transaction | VersionedTransaction>(transactions: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

type WalletContextStateOveride = {
  wallet: {
    adapter: WalletContextOveride;
  };
} & WalletContextOveride;

const makeWeb3AuthWalletContextState = (wallet: Wallet): WalletContextStateOveride => {
  const walletProps: WalletContextOveride = {
    connected: true,
    connecting: false,
    icon: "https://app.marginfi.com/mrgn-white.svg",
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

const useWalletContext = () => {
  let walletContextStateDefault = useWallet();
  const anchorWallet = useAnchorWallet();
  const {
    walletData: web3AuthWalletData,
    connected: web3AuthConnected,
    login: web3AuthLogin,
    logout: web3AuthLogout,
  } = useWeb3AuthWallet();
  const { query } = useRouter();
  const [walletContextState, setWalletContextState] = useState<WalletContextState | WalletContextStateOveride>(
    walletContextStateDefault
  );

  const { wallet, isOverride }: { wallet: Wallet | undefined; isOverride: boolean } = useMemo(() => {
    const override = query?.wallet as string;
    if (web3AuthWalletData && web3AuthConnected) {
      setWalletContextState(makeWeb3AuthWalletContextState(web3AuthWalletData));
      return {
        wallet: web3AuthWalletData,
        isOverride: false,
      };
    } else if (anchorWallet && override) {
      setWalletContextState(walletContextStateDefault);
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
    setWalletContextState(walletContextStateDefault);
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
  }, [anchorWallet, web3AuthWalletData, query, walletContextStateDefault, web3AuthConnected]);

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

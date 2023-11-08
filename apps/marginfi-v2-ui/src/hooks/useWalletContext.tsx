import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet, useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWeb3AuthWallet } from "./useWeb3AuthWallet";

export type WalletContextOverride = {
  connected: boolean;
  connecting: boolean;
  icon: string;
  connect: () => void;
  disconnect: () => void;
  select: () => void;
  publicKey: PublicKey | undefined;
  signTransaction: <T extends Transaction | VersionedTransaction>(transactions: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

export type WalletContextStateOverride = {
  wallet: {
    adapter: WalletContextOverride;
  };
} & WalletContextOverride;

const makeWeb3AuthWalletContextState = (wallet: Wallet): WalletContextStateOverride => {
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

  const walletContextState = useMemo(() => {
    if (web3AuthConnected && web3AuthWalletData) {
      return makeWeb3AuthWalletContextState(web3AuthWalletData);
    } else {
      return walletContextStateDefault;
    }
  }, [web3AuthConnected, walletContextStateDefault.connected]);

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
  }, [anchorWallet, web3AuthWalletData, query, web3AuthConnected, walletContextStateDefault.wallet]);

  const logout = useCallback(() => {
    if (web3AuthConnected) {
      web3AuthLogout();
    } else {
      walletContextState?.disconnect();
    }
  }, [walletContextState, web3AuthConnected, web3AuthLogout, walletContextStateDefault]);

  return {
    wallet,
    walletAddress: wallet?.publicKey,
    isOverride,
    connected: walletContextState?.connected || web3AuthConnected,
    connecting: walletContextState?.connecting,
    walletContextState,
    login: web3AuthLogin,
    logout,
  };
};

export { useWalletContext };

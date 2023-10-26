import React, { type FC, type ReactNode, useMemo, useEffect, useState, createContext, useContext } from "react";
import {
  Connection,
  type ConnectionConfig,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SendOptions,
  TransactionSignature,
} from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import { useXNftPublicKey, useXNftWallet } from "~/hooks/xnftHooks";
import { useIsMobile } from "~/hooks/useIsMobile";

export interface XNftWalletProviderProps {
  children: ReactNode;
  config?: ConnectionConfig;
}

export const XNftWalletProvider: FC<XNftWalletProviderProps> = ({ children }) => {
  const xNftWallet = useXNftWallet();
  const publicKey = useXNftPublicKey();

  const isMobile = useIsMobile();

  const connected = useMemo(() => !!publicKey, [publicKey]); // TODO use xNft listeners when known
  const connecting = useMemo(() => !connected, [connected]); // TODO use xNft listeners when known

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <WalletContext.Provider
      value={{
        wallet: xNftWallet || null,
        publicKey: publicKey,
        connected,
        connecting,
        disconnecting: false,
        sendTransaction: xNftSendTransaction,
        signTransaction: xNftWallet?.signTransaction ?? xNftSignTransaction,
        signAllTransactions: xNftWallet?.signAllTransactions ?? solanaSignAllTransactions,
        signMessage: xNftSignMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

const DEFAULT_CONTEXT: Partial<WalletContextState> = {
  connecting: false,
  connected: false,
  disconnecting: false,
  sendTransaction() {
    return Promise.reject(new Error("sendTransaction not found"));
  },
  signTransaction() {
    return Promise.reject(new Error("signTransaction not found"));
  },
  signAllTransactions() {
    return Promise.reject(new Error("signAllTransactions not found"));
  },
  signMessage() {
    return Promise.reject(new Error("signMessage not found"));
  },
};

export interface WalletContextState {
  wallet: Wallet | null;
  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;
  disconnecting: boolean;

  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendOptions | undefined
  ) => Promise<TransactionSignature>;
  signTransaction: (<T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>) | undefined;
  signAllTransactions: (<T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>) | undefined;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
}

export const WalletContext = createContext<WalletContextState>(DEFAULT_CONTEXT as WalletContextState);

export function useWallet(): WalletContextState {
  return useContext(WalletContext);
}

export const xNftSignMessage = async (message: Uint8Array) => {
  // to get message in Uint8Array do Buffer.from(message)
  return await window.xnft.solana.signMessage(message);
};

export const xNftSendTransaction = async (transaction: Transaction | VersionedTransaction) => {
  return await window.xnft.solana.send(transaction);
};

export const xNftSignTransaction = async (transaction: Transaction | VersionedTransaction) => {
  return await window.xnft.solana.signTransaction(transaction);
};

export const solanaSignAllTransactions = async (transactions: (Transaction | VersionedTransaction)[]) => {
  return await window.xnft.solana.signAllTransactions(transactions);
};

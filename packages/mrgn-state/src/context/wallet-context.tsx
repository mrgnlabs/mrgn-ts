import React, { createContext, useContext, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";

interface WalletContextState {
  walletAddress: PublicKey | undefined;
}

const WalletContext = createContext<WalletContextState | undefined>(undefined);

/**
 * Wallet context provider for mrgn-state package.
 * This provides wallet address state that can be consumed by all React Query hooks
 * without creating circular dependencies with mrgn-ui.
 */
export function WalletStateProvider({
  children,
  walletAddress: externalWalletAddress,
}: {
  children: React.ReactNode;
  walletAddress?: PublicKey;
}) {
  const [walletAddress, setWalletAddress] = useState<PublicKey | undefined>(externalWalletAddress);

  // Sync external wallet address changes
  useEffect(() => {
    setWalletAddress(externalWalletAddress);
  }, [externalWalletAddress]);

  return <WalletContext.Provider value={{ walletAddress }}>{children}</WalletContext.Provider>;
}

/**
 * Hook to get the current wallet address from mrgn-state internal context.
 * Used by React Query hooks to automatically get wallet address without prop drilling.
 */
export function useWalletAddress(): PublicKey | undefined {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletAddress must be used within a WalletStateProvider");
  }
  return context.walletAddress;
}

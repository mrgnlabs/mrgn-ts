import { createContext, useContext, useEffect, ReactNode } from "react";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { createBrowserSupabaseClient } from "~/auth/auth-client";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import type { WalletInfo } from "~/components/wallet-v2/";
import { useMrgnlendStore } from "~/store";
import { loginOrSignup } from "~/auth/utils/auth.utils";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  error: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { connected, wallet, walletAddress } = useWallet();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

  const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo;
  const walletId = walletInfo?.name || "";

  // Handle wallet connection/disconnection
  useEffect(() => {
    if (!initialized || !connected || !wallet || !walletAddress) return;

    // Use our existing loginOrSignup flow
    loginOrSignup(wallet, walletId).catch((error) => {
      toastManager.showErrorToast(`Auth error: ${error}`);
    });
  }, [initialized, connected, wallet, walletAddress, walletId]);

  // Wallet disconnection - handle logout
  useEffect(() => {
    if (!connected || !walletAddress) {
      const supabase = createBrowserSupabaseClient();
      supabase.auth.signOut().catch((error) => {
        toastManager.showErrorToast(`Logout error: ${error}`);
      });
    }
  }, [connected, walletAddress]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: connected && !!walletAddress,
        isLoading: !initialized,
        error: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

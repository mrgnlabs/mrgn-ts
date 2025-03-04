import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { createBrowserSupabaseClient } from "~/auth/auth-client";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import type { WalletInfo } from "~/components/wallet-v2/";
import { useMrgnlendStore } from "~/store";
import { loginOrSignup, logout } from "~/auth/utils/auth.utils";
import { AuthUser } from "../types/auth.types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  error: null,
  user: null,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo;
  const walletId = walletInfo?.name || "";

  // Check for existing session and authenticate if needed
  useEffect(() => {
    if (!initialized || !connected || !walletAddress) {
      setIsLoading(false);
      return;
    }

    const authenticate = async () => {
      setIsLoading(true);

      try {
        // Try to authenticate with the wallet address
        // If we have a valid cookie, this will succeed without requiring a signature
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: walletAddress.toBase58(),
            walletId,
          }),
          credentials: "include", // Critical: include cookies in the request
        });

        const data = await response.json();

        if (response.ok && data.user) {
          // Authentication successful with existing cookie
          setUser(data.user);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // No valid cookie or user not found, need to go through the full auth flow
        if (wallet) {
          const authResult = await loginOrSignup(wallet, walletId);
          if (authResult.user && !authResult.error) {
            setUser(authResult.user);
            setIsAuthenticated(true);
          } else if (authResult.error) {
            setError(new Error(authResult.error));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        toastManager.showErrorToast(`Auth error: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, [initialized, connected, wallet, walletAddress, walletId]);

  // Wallet disconnection - handle logout
  useEffect(() => {
    // Only logout if we were previously connected and now we're not
    if ((!connected || !walletAddress) && isAuthenticated) {
      setIsAuthenticated(false);
      setUser(null);

      console.log("Logging out due to wallet disconnection");

      logout().catch((error) => {
        toastManager.showErrorToast(`Logout error: ${error}`);
      });
    }
  }, [connected, walletAddress, isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        error,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

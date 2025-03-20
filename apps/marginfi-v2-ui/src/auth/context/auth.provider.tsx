import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import type { WalletInfo } from "~/components/wallet-v2/";
import { useMrgnlendStore } from "~/store";
import { authenticate, logout, getCurrentUser } from "~/auth/utils/auth.utils";
import { AuthUser } from "../types/auth.types";
import { Wallet } from "@mrgnlabs/mrgn-common";

type AuthState = "loading" | "authenticated" | "unauthenticated" | undefined;

interface AuthContextType {
  authState: AuthState;
  error: Error | null;
  user: AuthUser | null;
  authenticateUser: (args: { wallet: Wallet; walletId?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authState: undefined,
  error: null,
  user: null,
  authenticateUser: async () => {},
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
  const [authState, setAuthState] = useState<AuthState>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo;
  const walletId = walletInfo?.name || "";

  const authenticateUser = useCallback(
    async (args: { wallet: Wallet; walletId?: string }) => {
      console.log("Authenticating...");
      setAuthState("loading");

      try {
        const authResult = await authenticate(args.wallet, args.walletId);

        if (authResult.user && !authResult.error) {
          console.log("Authenticated user:", authResult.user);
          setUser(authResult.user);
          setAuthState("authenticated");
        } else if (authResult.error) {
          console.log("Authentication error:", authResult.error);
          setError(new Error(String(authResult.error)));
          setAuthState("unauthenticated");
        } else {
          // Handle case where both user and error are null
          setError(new Error("Unknown authentication error"));
          setAuthState("unauthenticated");
        }
      } catch (err) {
        console.log("Authentication error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toastManager.showErrorToast(`Auth error: ${err}`);
        setAuthState("unauthenticated");
      }
    },
    [setUser, setAuthState, setError]
  );

  // Check for existing session and authenticate if needed
  useEffect(() => {
    if (!initialized || !connected || !walletAddress || !wallet || authState) {
      return;
    }

    const _auth = async () => {
      try {
        // First try to get the current user from the session
        const { user, error } = await getCurrentUser();

        if (user) {
          setUser(user);
          setAuthState("authenticated");
        } else {
          // No existing session, try to authenticate with wallet
          await authenticateUser({ wallet, walletId });
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setAuthState("unauthenticated");
      }
    };

    _auth();
  }, [initialized, connected, wallet, walletAddress, walletId, authState, authenticateUser]);

  // Wallet disconnection - handle logout
  useEffect(() => {
    // Only logout if we were previously connected and now we're not
    if ((!connected || !walletAddress) && authState === "authenticated") {
      const handleLogout = async () => {
        try {
          setAuthState("unauthenticated");
          setUser(null);
          const logoutResult = await logout();

          if (!logoutResult.success && logoutResult.error) {
            console.error("Logout error:", logoutResult.error);
            toastManager.showErrorToast(`Logout error: ${logoutResult.error}`);
          }
        } catch (error) {
          console.error("Logout error:", error);
          toastManager.showErrorToast(`Logout error: ${error}`);
        }
      };

      handleLogout();
    }
  }, [connected, walletAddress, authState]);

  return (
    <AuthContext.Provider
      value={{
        authState,
        error,
        user,
        authenticateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

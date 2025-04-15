"use client";

import React from "react";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import { useWallet, WalletInfo } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore } from "~/store";
import { createBrowserSupabaseClient } from "~/auth/auth-client";
import { authenticate, logout, getCurrentUser } from "~/auth/utils/auth.utils";
import { AuthUser } from "~/auth/types/auth.types";

const supabase = createBrowserSupabaseClient();

type AuthState = "loading" | "authenticated" | "unauthenticated" | undefined;

interface AuthContextType {
  authState: AuthState;
  error: Error | null;
  user: AuthUser | null;
  authenticateUser: (args: { wallet: Wallet; walletId?: string }) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  authState: undefined,
  error: null,
  user: null,
  authenticateUser: async () => {},
});

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { connected, wallet, walletAddress } = useWallet();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  const [authState, setAuthState] = React.useState<AuthState>(undefined);
  const [error, setError] = React.useState<Error | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);

  const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo;
  const walletId = walletInfo?.name || "";

  const authenticateUser = React.useCallback(
    async (args: { wallet: Wallet; walletId?: string }) => {
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

  // Combined authentication management
  React.useEffect(() => {
    // Setup Supabase auth state listener - using the singleton instance
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setAuthState("unauthenticated");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // When signed in or token refreshed, get the current user data
        getCurrentUser()
          .then(({ user, error }) => {
            if (user && !error) {
              setUser(user);
              setAuthState("authenticated");
            } else if (error) {
              console.error("Auth state change error:", error);
              setError(new Error(String(error)));
              setAuthState("unauthenticated");
            }
          })
          .catch((err) => {
            console.error("Error getting user after auth state change:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setAuthState("unauthenticated");
          });
      }
    });

    // Initial authentication check
    const checkInitialAuth = async () => {
      // Only proceed if we have a wallet connection and no auth state yet
      if (!initialized || !connected || !walletAddress || !wallet || authState) {
        return;
      }

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

    checkInitialAuth();

    // Handle wallet disconnection
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

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [initialized, connected, wallet, walletAddress, walletId, authState, authenticateUser]);

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

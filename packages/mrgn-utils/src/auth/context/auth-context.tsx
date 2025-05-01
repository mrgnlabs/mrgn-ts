import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { AuthUser } from "../types/auth.types";
import { authenticate, getCurrentUser, logout as logoutUser } from "../utils/auth.utils";

// Check if authentication is enabled (defaults to true if not specified)
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

export interface AuthContextProps {
  user: AuthUser | null;
  isAuthenticating: boolean;
  signatureDenied: boolean;
  isAwaitingSignature: boolean;

  authenticateUser: (
    wallet: Wallet,
    connection: Connection,
    args?: { walletId?: string; referralCode?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetSignatureDenied: () => void;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signatureDenied, setSignatureDenied] = useState<boolean>(false);
  const [isAwaitingSignature, setIsAwaitingSignature] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const resetSignatureDenied = useCallback(() => {
    setSignatureDenied(false);
  }, []);

  const authenticateUser = useCallback(
    async (wallet: Wallet, connection: Connection, args?: { walletId?: string; referralCode?: string }) => {
      if (!isAuthEnabled) {
        return;
      }

      if (!wallet.publicKey) {
        console.error("Wallet not connected");
        return;
      }

      setIsAuthenticating(true);
      setIsAwaitingSignature(true);

      try {
        const walletId = args?.walletId;
        const referralCode = args?.referralCode;

        const authResult = await authenticate(wallet, connection, walletId, referralCode);

        setIsAwaitingSignature(false);

        if (authResult.user) {
          setUser(authResult.user);
          setSignatureDenied(false);
        } else if (authResult.error) {
          const errorString = String(authResult.error).toLowerCase();

          if (
            ["user rejected", "declined", "denied", "rejected", "closed", "cancelled"].some((str) =>
              errorString.includes(str)
            )
          ) {
            setSignatureDenied(true);
          }

          console.error("Authentication error:", authResult.error);
        }
      } catch (err) {
        console.error("Authentication error:", err);
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const logoutResult = await logoutUser();

      if (logoutResult.success) {
        setUser(null);
      } else if (logoutResult.error) {
        console.error("Logout error:", logoutResult.error);
      }
    } catch (err) {
      console.error("Error during logout:", err);
    }
  }, []);

  // Check for existing user session on mount
  useEffect(() => {
    if (!isAuthEnabled) {
      return;
    }

    const checkAuth = async () => {
      try {
        setIsAuthenticating(true);
        const { user, error } = await getCurrentUser();

        if (user && !error) {
          setUser(user);
        } else if (error) {
          console.error("Auth check error:", error);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setIsAuthenticating(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticating,
        signatureDenied,
        isAwaitingSignature,

        authenticateUser,
        logout,
        resetSignatureDenied,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within the AuthProvider");
  }

  return context;
}

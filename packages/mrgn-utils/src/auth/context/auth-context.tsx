import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { Session } from "@supabase/supabase-js";

import { AuthUser } from "../types/auth.types";
import { authenticate, logout as logoutUser } from "../utils/auth.utils";

// Check if authentication is enabled (defaults to true if not specified)
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

export interface AuthContextProps {
  user: AuthUser | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
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

  // Check for existing user session on mount and listen for auth state changes
  // useEffect(() => {
  //   // Store reference to auth for cleanup
  //   const auth = supabase.auth;

  //   if (!isAuthEnabled) {
  //     return;
  //   }

  //   // Initial session check
  //   const checkSession = async () => {
  //     try {
  //       setIsAuthenticating(true);

  //       // Get current session from Supabase
  //       const { data: { session: currentSession } } = await auth.getSession();
  //       setSession(currentSession);

  //       if (currentSession) {
  //         // Get user data if session exists
  //         // First try to get user from the session
  //         if (currentSession.user) {
  //           const authUser: AuthUser = {
  //             id: currentSession.user.id,
  //             walletAddress: currentSession.user.user_metadata?.wallet_address,
  //             walletId: currentSession.user.user_metadata?.wallet_id,
  //             referralCode: currentSession.user.user_metadata?.referral_code,
  //             referredBy: currentSession.user.user_metadata?.referred_by,
  //             lastLogin: currentSession.user.last_sign_in_at,
  //           };
  //           setUser(authUser);
  //         } else {
  //           // Fallback to API call if user data not in session
  //           const { user: userData, error } = await getCurrentUser();
  //           if (userData && !error) {
  //             setUser(userData);
  //           } else if (error) {
  //             console.error("Auth check error:", error);
  //           }
  //         }
  //       }
  //     } catch (err) {
  //       console.error("Session check error:", err);
  //     } finally {
  //       setIsAuthenticating(false);
  //     }
  //   };

  //   checkSession();

  //   // Subscribe to auth state changes
  //   const { data: { subscription } } = auth.onAuthStateChange(async (event, newSession) => {
  //     console.log("Auth state changed:", event);
  //     setSession(newSession);

  //     if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  //       // Get user data from the session if available
  //       if (newSession?.user) {
  //         const authUser: AuthUser = {
  //           id: newSession.user.id,
  //           walletAddress: newSession.user.user_metadata?.wallet_address,
  //           walletId: newSession.user.user_metadata?.wallet_id,
  //           referralCode: newSession.user.user_metadata?.referral_code,
  //           referredBy: newSession.user.user_metadata?.referred_by,
  //           lastLogin: newSession.user.last_sign_in_at,
  //         };
  //         setUser(authUser);
  //       } else {
  //         // Fallback to API call
  //         const { user: userData, error } = await getCurrentUser();
  //         if (userData && !error) {
  //           setUser(userData);
  //         }
  //       }
  //     } else if (event === 'SIGNED_OUT') {
  //       setUser(null);
  //     }
  //   });

  //   // Cleanup subscription on unmount
  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, [supabase.auth]);  // Include supabase.auth as a dependency
  // TODO: Implement auto sign in

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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

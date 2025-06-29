import { User } from "firebase/auth";

import { DEFAULT_USER_POINTS_DATA, subscribeToAuthState } from "../../lib";
import React from "react";
import { useFirebaseAuthMutations, useFirebaseUser, useUserPoints } from "../react-query";
import { useWalletAddress } from "../../context";
import { useQueryClient } from "@tanstack/react-query";

// ----------------------------------------------------------------------------
// Firebase Auth State Management
// ----------------------------------------------------------------------------

/**
 * Hook to manage Firebase authentication state
 * Subscribes to auth state changes and provides current user info
 */
export function useFirebaseAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const unsubscribe = subscribeToAuthState((newUser) => {
      setUser(newUser);
      setIsLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
  };
}

/**
 * Hook to check if user exists in Firebase
 * Returns boolean indicating user existence
 */
export function useFirebaseUserExists(): {
  data: boolean;
  userExists: boolean;
  error: any;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  refetch: () => void;
} {
  const { data: userData, ...rest } = useFirebaseUser();

  return {
    ...rest,
    data: Boolean(userData),
    userExists: Boolean(userData),
  };
}

// ----------------------------------------------------------------------------
// Composite Hook for Complete Firebase Integration
// ----------------------------------------------------------------------------

/**
 * Main Firebase integration hook that combines auth state and user management
 * This replaces the original useFirebaseAccount functionality
 */
export function useFirebaseIntegration() {
  const walletAddress = useWalletAddress();
  const queryClient = useQueryClient();

  // Get auth state
  const { user: firebaseUser, isAuthenticated, isLoading: authLoading } = useFirebaseAuth();

  // Get user data
  const { data: userData, isLoading: userDataLoading } = useFirebaseUser();

  // Get points data
  const { data: pointsData, isLoading: pointsLoading } = useUserPoints();

  // Get auth mutations
  const { loginOrSignup, logout } = useFirebaseAuthMutations();

  // Auto-login effect when wallet connects
  React.useEffect(() => {
    if (!walletAddress) return;

    const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null");
    const walletId = walletInfo?.name || "";

    // Get referral code from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get("referralCode") || undefined;

    // Trigger login/signup
    loginOrSignup.mutate({ walletId, referralCode });
  }, [walletAddress, loginOrSignup]);

  // Auto-logout effect when wallet disconnects or changes
  React.useEffect(() => {
    if (!walletAddress && firebaseUser) {
      // Wallet disconnected but Firebase user still logged in
      logout.mutate();
    } else if (walletAddress && firebaseUser && walletAddress.toBase58() !== firebaseUser.uid) {
      // Wallet address changed but different Firebase user logged in
      logout.mutate();
    }
  }, [walletAddress, firebaseUser, logout]);

  // Auto-fetch points when user logs in
  React.useEffect(() => {
    if (firebaseUser) {
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
    } else {
      // Reset points data when user logs out
      queryClient.setQueryData(["userPoints", walletAddress?.toBase58() ?? null], DEFAULT_USER_POINTS_DATA);
    }
  }, [firebaseUser, queryClient, walletAddress]);

  return {
    // Auth state
    firebaseUser,
    isAuthenticated,
    isLoading: authLoading || userDataLoading || pointsLoading,

    // User data
    userData,
    hasUser: Boolean(userData),

    // Points data
    pointsData,

    // Mutations
    loginOrSignup,
    logout,

    // Loading states
    isAuthLoading: authLoading,
    isUserDataLoading: userDataLoading,
    isPointsLoading: pointsLoading,
  };
}

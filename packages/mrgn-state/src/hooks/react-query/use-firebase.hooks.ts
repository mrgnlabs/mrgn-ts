import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "firebase/auth";
import { DocumentData } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";

import {
  signOutUser,
  loginOrSignup,
  login,
  signup,
  UserData,
} from "../../lib/firebase.utils";
import {
  getPointsSummary,
  UserPointsData,
  DEFAULT_USER_POINTS_DATA,
  fetchLeaderboardData,
  fetchTotalLeaderboardCount,
  fetchUserRank,
  fetchTotalUserCount,
  LeaderboardRow,
  LeaderboardSettings,
} from "../../lib/points.utils";
import { useWalletAddress } from "../../context/wallet-state.context";
import { fetchUser, fetchUserPoints } from "../../api";

// ----------------------------------------------------------------------------
// Firebase User Data Management
// ----------------------------------------------------------------------------

/**
 * Hook to get Firebase user data by wallet address
 * Uses wallet address from wallet context
 */
export function useFirebaseUser() {
  const walletAddress = useWalletAddress();

  return useQuery<UserData | undefined, Error>({
    queryKey: ["firebaseUser", walletAddress?.toBase58() ?? null],
    queryFn: async () => {
      if (!walletAddress) {
        return undefined;
      }
      return await fetchUser(walletAddress.toBase58());
    },
    enabled: Boolean(walletAddress),
    staleTime: 5 * 60_000, // 5 minutes
    retry: 2,
  });
}

// ----------------------------------------------------------------------------
// User Points Management
// ----------------------------------------------------------------------------

/**
 * Hook to get user points data
 * Enhanced version with wallet-specific points
 */
export function useUserPoints() {
  const walletAddress = useWalletAddress();

  return useQuery<UserPointsData, Error>({
    queryKey: ["userPoints", walletAddress?.toBase58() ?? null],
    queryFn: async () => {
      const wallet = walletAddress?.toBase58();
      return await fetchUserPoints(wallet);
    },
    enabled: Boolean(walletAddress),
    staleTime: 2 * 60_000, // 2 minutes
    retry: 2,
    // Return default data while loading
    placeholderData: DEFAULT_USER_POINTS_DATA,
  });
}

/**
 * Hook to get global points summary
 * Updated version of existing usePoints hook
 */
export function usePointsSummary() {
  return useQuery<DocumentData, Error>({
    queryKey: ["pointsSummary"],
    queryFn: () => getPointsSummary(),
    staleTime: 5 * 60_000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// ----------------------------------------------------------------------------
// Firebase Auth Mutations
// ----------------------------------------------------------------------------

/**
 * Hook providing Firebase authentication mutations
 * Handles login, signup, and logout with proper cache invalidation
 */
export function useFirebaseAuthMutations() {
  const queryClient = useQueryClient();
  const walletAddress = useWalletAddress();

  const loginMutation = useMutation({
    mutationFn: async ({ walletId, referralCode }: { walletId?: string; referralCode?: string }) => {
      if (!walletAddress) {
        throw new Error("Wallet address is required for login");
      }
      await loginOrSignup(walletAddress.toBase58(), walletId, referralCode);
    },
    onSuccess: () => {
      // Invalidate relevant queries after successful login
      queryClient.invalidateQueries({ queryKey: ["firebaseUser"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
    },
    onError: (error) => {
      console.error("Login/signup error:", error);
    },
  });

  const explicitLoginMutation = useMutation({
    mutationFn: async ({ walletId }: { walletId?: string }) => {
      if (!walletAddress) {
        throw new Error("Wallet address is required for login");
      }
      await login(walletAddress.toBase58(), walletId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firebaseUser"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ walletId, referralCode }: { walletId?: string; referralCode?: string }) => {
      if (!walletAddress) {
        throw new Error("Wallet address is required for signup");
      }
      await signup(walletAddress.toBase58(), walletId, referralCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firebaseUser"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOutUser();
    },
    onSuccess: () => {
      // Clear all user-related queries on logout
      queryClient.invalidateQueries({ queryKey: ["firebaseUser"] });
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.removeQueries({ queryKey: ["firebaseUser"] });
      queryClient.removeQueries({ queryKey: ["userPoints"] });
    },
  });

  return {
    loginOrSignup: loginMutation,
    login: explicitLoginMutation,
    signup: signupMutation,
    logout: logoutMutation,
  };
}

// ----------------------------------------------------------------------------
// Leaderboard Data Management
// ----------------------------------------------------------------------------

/**
 * Hook to get leaderboard data with pagination, sorting, and search
 * @param settings LeaderboardSettings for pagination, sorting, and search
 * @param connection Solana connection for domain name resolution
 */
export function useLeaderboardData(
  settings: LeaderboardSettings, 
  connection: Connection
) {
  return useQuery<LeaderboardRow[], Error>({
    queryKey: [
      "leaderboardData", 
      settings.pageSize,
      settings.currentPage, 
      settings.orderCol, 
      settings.orderDir, 
      settings.search,
      settings.pageDirection
    ],
    queryFn: () => fetchLeaderboardData(connection, settings),
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
    // Using placeholderData instead of keepPreviousData for pagination UX
    placeholderData: (prev) => prev, // Keep previous data while loading new data
  });
}

/**
 * Hook to get total count of leaderboard entries
 */
export function useLeaderboardCount() {
  return useQuery<number, Error>({
    queryKey: ["leaderboardCount"],
    queryFn: () => fetchTotalLeaderboardCount(),
    staleTime: 10 * 60_000, // 10 minutes since this rarely changes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get the rank of a specific user
 * @param address Wallet address to get rank for
 */
export function useUserRank(address: string | undefined) {
  return useQuery<number, Error>({
    queryKey: ["userRank", address],
    queryFn: () => fetchUserRank(address || ""),
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: Boolean(address),
  });
}

/**
 * Hook to get the total number of users in the points system
 */
export function useTotalUserCount() {
  return useQuery<number, Error>({
    queryKey: ["totalUserCount"],
    queryFn: () => fetchTotalUserCount(),
    staleTime: 10 * 60_000, // 10 minutes since this rarely changes
    refetchOnWindowFocus: false,
  });
}

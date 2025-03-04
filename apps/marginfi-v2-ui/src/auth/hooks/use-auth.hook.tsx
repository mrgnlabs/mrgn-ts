import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { createBrowserSupabaseClient } from "~/auth/auth-client";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import type { WalletInfo } from "~/components/wallet-v2/";
import { useMrgnlendStore } from "~/store";

export const useAuth = () => {
  const { connected, walletAddress } = useWallet();
  const { query: routerQuery } = useRouter();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

  const referralCode = routerQuery.referralCode as string | undefined;
  const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo;
  const walletId = walletInfo?.name || "";

  // Supabase auth state listener
  useEffect(() => {
    if (!initialized) return;

    const supabase = createBrowserSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        console.log("Supabase auth state changed:", event);
        // We can add additional state management here later if needed
      }
    });

    return () => subscription.unsubscribe();
  }, [initialized]);

  // Wallet connection - attempt Supabase login
  useEffect(() => {
    if (!walletAddress) return;

    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: walletAddress.toBase58(),
        walletId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          const supabase = createBrowserSupabaseClient();
          supabase.auth.setSession({
            access_token: data.token,
            refresh_token: data.token,
          });
        }
      })
      .catch((error) => {
        toastManager.showErrorToast(`Error signing in: ${error}`);
      });
  }, [walletAddress, walletId]);

  // Wallet disconnection - Supabase logout
  useEffect(() => {
    const handleLogout = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        await supabase.auth.signOut();

        // Also call our logout endpoint to clear the cookie
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        toastManager.showErrorToast(`Error signing out: ${error}`);
      }
    };

    if (!connected || !walletAddress) {
      handleLogout();
    }
  }, [connected, walletAddress]);
};

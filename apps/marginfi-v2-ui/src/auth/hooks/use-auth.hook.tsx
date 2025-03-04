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
        // We can add additional state management here later if needed
      }
    });

    return () => subscription.unsubscribe();
  }, [initialized]);

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

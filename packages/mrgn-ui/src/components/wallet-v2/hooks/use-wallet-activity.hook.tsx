import React from "react";
import { useWallet } from "./use-wallet.hook";
import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletActivity } from "../types/wallet.types";

export const useWalletActivity = () => {
  const { connected, walletAddress } = useWallet();
  const [activities, setActivities] = React.useState<WalletActivity[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchActivities = React.useCallback(async () => {
    if (!connected || !walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const idToken = await firebaseApi.auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Not authenticated");
      }

      console.log("Fetching activities with token");
      const response = await fetch("/api/activity/get", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch activities");
      }

      const data = await response.json();
      console.log("Received activities:", data);

      if (!data.activities || !Array.isArray(data.activities)) {
        console.error("Invalid activities data:", data);
        throw new Error("Invalid activities data received");
      }

      setActivities(data.activities);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching activities:", err);
    } finally {
      setIsLoading(false);
    }
  }, [connected, walletAddress]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    error,
    refetch: fetchActivities,
  };
};

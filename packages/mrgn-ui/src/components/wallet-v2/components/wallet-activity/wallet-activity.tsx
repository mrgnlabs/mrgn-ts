import React from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { Input } from "~/components/ui/input";
import { useWalletActivity } from "../../hooks/use-wallet-activity.hook";
import { useWallet } from "../../hooks/use-wallet.hook";
import { WalletActivityItem, WalletActivityItemSkeleton } from "./components/wallet-activity-item";

type WalletActivityProps = {
  extendedBankInfos: ExtendedBankInfo[];
  onRerun: () => void;
};

const WalletActivity = ({ extendedBankInfos, onRerun }: WalletActivityProps) => {
  const { connected, walletContextState } = useWallet();
  const { activities, isLoading, error, refetch } = useWalletActivity();
  const [type, setType] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const banks = React.useMemo(() => {
    return activities.map((activity) => {
      const matchingBank = extendedBankInfos.find((bank) => bank.info.state.mint.toBase58() === activity.details.mint);
      if (!matchingBank) {
        console.warn(`No matching bank found for activity with mint ${activity.details.mint}`);
        return null;
      }
      return matchingBank;
    });
  }, [activities, extendedBankInfos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/activity/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          details: details ? JSON.parse(details) : {},
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create activity");
      }

      // Reset form and refetch activities
      setType("");
      setDetails("");
      refetch();
    } catch (err: any) {
      setSubmitError(err.message);
      console.error("Error creating activity:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return <div className="text-sm text-muted-foreground">Connect your wallet to view activity</div>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-2 hidden">
        <div>
          <Input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Activity type"
            required
          />
        </div>
        <div>
          <textarea
            value={details}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDetails(e.target.value)}
            placeholder="Details (JSON format)"
            className="w-full p-2 text-sm border rounded bg-background"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Activity"}
        </button>
        {submitError && <div className="text-sm text-red-500">Error: {submitError}</div>}
      </form>

      {isLoading ? (
        <div className="space-y-2 h-[calc(100vh-190px)] overflow-y-auto">
          {Array.from({ length: 5 }).map((_, index) => (
            <WalletActivityItemSkeleton key={index} style={{ opacity: (5 - index) * 0.2 }} />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">Error loading activities: {error}</div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center">No activity yet.</p>
      ) : (
        <div className="space-y-2 h-[calc(100vh-190px)] overflow-y-auto">
          {activities.map((activity, index) => {
            const bank = banks[index];
            if (!bank) return null;
            return (
              <WalletActivityItem
                key={index}
                activity={activity}
                bank={bank}
                walletContextState={walletContextState as WalletContextStateOverride}
                onRerun={() => {
                  onRerun();
                  setTimeout(() => refetch(), 2000);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export { WalletActivity };

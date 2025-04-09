import React from "react";
import { useWalletActivity } from "../../hooks/use-wallet-activity.hook";
import { useWallet } from "../../hooks/use-wallet.hook";
import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const WalletActivity = () => {
  const { connected } = useWallet();
  const { activities, isLoading, error, refetch } = useWalletActivity();
  const [type, setType] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const idToken = await firebaseApi.auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/activity/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
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
        <div className="text-sm text-muted-foreground">Loading activities...</div>
      ) : error ? (
        <div className="text-sm text-red-500">Error loading activities: {error}</div>
      ) : activities.length === 0 ? (
        <div className="text-sm text-muted-foreground">No activity yet</div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-2 text-sm border rounded">
              <div className="flex flex-col">
                <span className="font-medium">{activity.type}</span>
                <span className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {Object.entries(activity.details).map(([key, value]) => (
                  <div key={key}>
                    {key}: {value}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { WalletActivity };

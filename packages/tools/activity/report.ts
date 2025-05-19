import { getDefaultYargsOptions } from "../lib/config";
import { getCachedActivity } from "../lib/utils";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

async function main() {
  const argv = getDefaultYargsOptions().parseSync();

  // Get cached activity data
  const activities = getCachedActivity();
  const wallets = Object.keys(activities);
  const totalWallets = wallets.length;

  // Calculate total activities
  const totalActivities = Object.values(activities).reduce((sum, walletActivities) => sum + walletActivities.length, 0);

  // Find wallet with highest activity count
  const walletActivityCounts = wallets.map((wallet) => ({
    wallet,
    count: activities[wallet].length,
  }));
  const mostActiveWallet = walletActivityCounts.reduce((max, current) => (current.count > max.count ? current : max));

  // Calculate activity by day and hour
  const activityByDay = new Map<string, number>();
  const activityByHour = new Map<number, number>();

  Object.values(activities)
    .flat()
    .forEach((activity) => {
      const date = new Date(activity.timestamp);

      // Count by day
      const dayKey = date.toISOString().split("T")[0];
      activityByDay.set(dayKey, (activityByDay.get(dayKey) || 0) + 1);

      // Count by hour
      const hour = date.getUTCHours();
      activityByHour.set(hour, (activityByHour.get(hour) || 0) + 1);
    });

  // Find most active day
  const mostActiveDay = Array.from(activityByDay.entries()).reduce((max, current) =>
    current[1] > max[1] ? current : max
  );

  // Find most active hour
  const mostActiveHour = Array.from(activityByHour.entries()).reduce((max, current) =>
    current[1] > max[1] ? current : max
  );

  // Print report
  console.log("\nActivity Report");
  console.log("==============");
  console.log(`Total wallets with activity: ${totalWallets}`);
  console.log(`Total activity logs: ${totalActivities}`);
  console.log(`Most active wallet: ${mostActiveWallet.wallet}`);
  console.log(`Activity count of most active wallet: ${mostActiveWallet.count}`);
  console.log(`Most active day: ${mostActiveDay[0]} (${mostActiveDay[1]} activities)`);
  console.log(`Most active hour (UTC): ${mostActiveHour[0]}:00 (${mostActiveHour[1]} activities)`);
}

main().catch((err) => {
  console.error(err);
});

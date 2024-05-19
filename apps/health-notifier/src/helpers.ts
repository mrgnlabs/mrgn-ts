import { DappAddress } from "@dialectlabs/sdk";
import { Subscriber } from "./health-notifier";

export function reduceSubscribers(dappAddresses: DappAddress[]): { [wallet: string]: Subscriber } {
  const subscribersMap = dappAddresses.reduce((acc, curr) => {
    const wallet = curr.address.wallet.address;
    if (!acc[wallet]) {
      acc[wallet] = { wallet, sinks: [] };
    }
    acc[wallet].sinks.push(curr.address.type);
    return acc;
  }, {} as { [wallet: string]: Subscriber });

  return subscribersMap;
}

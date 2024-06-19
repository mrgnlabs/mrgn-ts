import Link from "next/link";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { useTradeStore } from "~/store";

export const ActiveGroup = () => {
  const [activeGroup, marginfiClient] = useTradeStore((state) => [state.activeGroup, state.marginfiClient]);

  return (
    <div className="fixed bottom-14 left-6 bg-secondary/90 max-w-fit p-4 rounded-xl text-sm z-50">
      {(!activeGroup || !marginfiClient) && <p>No active group</p>}
      {activeGroup && marginfiClient && (
        <ul className="space-y-1">
          <li>
            <strong className="font-medium">Active token</strong>:{" "}
            <Link
              href={`https://birdeye.so/token/${activeGroup.token.info.rawBank.mint.toBase58()}`}
              target="_blank"
              rel="noreferrer"
              className="text-chartreuse"
            >
              {activeGroup.token.meta.tokenSymbol}
            </Link>
          </li>
          <li>
            <strong className="font-medium">Active group</strong>:{" "}
            <Link
              href={`https://solana.fm/address/${marginfiClient.groupAddress.toBase58()}`}
              target="_blank"
              rel="noreferrer"
              className="text-chartreuse"
            >
              {shortenAddress(marginfiClient.groupAddress)}
            </Link>
          </li>
          <li>
            <strong className="font-medium">Active token bank</strong>:{" "}
            <Link
              href={`https://birdeye.so/token/${activeGroup.token.address.toBase58()}`}
              target="_blank"
              rel="noreferrer"
              className="text-chartreuse"
            >
              {shortenAddress(activeGroup.token.address.toBase58())}
            </Link>
          </li>
          <li>
            <strong className="font-medium">Active collateral bank</strong>:{" "}
            <Link
              href={`https://solana.fm/address/${activeGroup.usdc.address.toBase58()}`}
              target="_blank"
              rel="noreferrer"
              className="text-chartreuse"
            >
              {shortenAddress(activeGroup.usdc.address.toBase58())}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
};

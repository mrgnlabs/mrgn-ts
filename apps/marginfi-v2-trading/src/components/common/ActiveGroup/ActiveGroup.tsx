import React from "react";

import Link from "next/link";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { IconChevronUp, IconX } from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { Button } from "~/components/ui/button";

export const ActiveGroup = () => {
  const [activeGroupPk, groupMap, selectedAccount, marginfiClient] = useTradeStore((state) => [
    state.activeGroup,
    state.groupMap,
    state.selectedAccount,
    state.marginfiClient,
  ]);

  const activeGroup = React.useMemo(() => {
    const group = activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : null;
    return group ? { token: group.pool.token, usdc: group.pool.quoteTokens[0] } : null;
  }, [activeGroupPk, groupMap]);
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={() => setIsOpen(true)} className="fixed bottom-14 left-6 text-sm z-50">
        Open debugger
        <IconChevronUp size={14} />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-14 left-6 bg-secondary/90 max-w-fit p-4 rounded-xl text-sm z-50">
      {(!activeGroup || !activeGroup.token || !marginfiClient) && <p>No active group</p>}
      {activeGroup && activeGroup.token && marginfiClient && isOpen && (
        <>
          <Button variant="ghost" className="absolute top-2 right-2 h-auto p-1" onClick={() => setIsOpen(false)}>
            <IconX size={14} />
          </Button>
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
            {selectedAccount && (
              <li>
                <strong className="font-medium">Selected account</strong>:{" "}
                <Link
                  href={`https://solana.fm/address/${selectedAccount.address.toBase58()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-chartreuse"
                >
                  {shortenAddress(activeGroup.usdc.address.toBase58())}
                </Link>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

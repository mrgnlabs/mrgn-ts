import React from "react";

import Link from "next/link";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { IconChevronUp, IconX } from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { Button } from "~/components/ui/button";

export const ActiveGroup = () => {
  const [activeGroupPk, groupMap] = useTradeStore((state) => [state.activeGroup, state.groupMap]);

  const activeGroup = React.useMemo(() => {
    return (activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : null) ?? null;
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
      {(!activeGroup || !activeGroup.pool.token || !activeGroup.client) && <p>No active group</p>}
      {activeGroup && activeGroup.pool.token && activeGroup.client && isOpen && (
        <>
          <Button variant="ghost" className="absolute top-2 right-2 h-auto p-1" onClick={() => setIsOpen(false)}>
            <IconX size={14} />
          </Button>
          <ul className="space-y-1">
            <li>
              <strong className="font-medium">Active token</strong>:{" "}
              <Link
                href={`https://birdeye.so/token/${activeGroup.pool.token.info.rawBank.mint.toBase58()}`}
                target="_blank"
                rel="noreferrer"
                className="text-chartreuse"
              >
                {activeGroup.pool.token.meta.tokenSymbol}
              </Link>
            </li>
            <li>
              <strong className="font-medium">Active group</strong>:{" "}
              <Link
                href={`https://solana.fm/address/${activeGroup.client.groupAddress.toBase58()}`}
                target="_blank"
                rel="noreferrer"
                className="text-chartreuse"
              >
                {shortenAddress(activeGroup.client.groupAddress)}
              </Link>
            </li>
            <li>
              <strong className="font-medium">Active token bank</strong>:{" "}
              <Link
                href={`https://birdeye.so/token/${activeGroup.pool.token.address.toBase58()}`}
                target="_blank"
                rel="noreferrer"
                className="text-chartreuse"
              >
                {shortenAddress(activeGroup.pool.token.address.toBase58())}
              </Link>
            </li>
            <li>
              <strong className="font-medium">Active collateral bank</strong>:{" "}
              <Link
                href={`https://solana.fm/address/${activeGroup.pool.quoteTokens[0].address.toBase58()}`}
                target="_blank"
                rel="noreferrer"
                className="text-chartreuse"
              >
                {shortenAddress(activeGroup.pool.quoteTokens[0].address.toBase58())}
              </Link>
            </li>
            {activeGroup?.selectedAccount && (
              <li>
                <strong className="font-medium">Selected account</strong>:{" "}
                <Link
                  href={`https://solana.fm/address/${activeGroup.selectedAccount.address.toBase58()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-chartreuse"
                >
                  {shortenAddress(activeGroup.selectedAccount.address.toBase58())}
                </Link>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

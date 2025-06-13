"use client";

import React from "react";
import Link from "next/link";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { IconExternalLink, IconCopy, IconCheck } from "@tabler/icons-react";
import { cn } from "@mrgnlabs/mrgn-utils";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

type AddressActionsProps = {
  address: PublicKey | string;
  shorten?: boolean;
  icon?: React.ReactNode;
  hideActions?: boolean;
};

const AddressActions = ({ address, icon, shorten = true, hideActions = true }: AddressActionsProps) => {
  const addressString = typeof address === "string" ? address : address.toBase58();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="group flex items-center justify-between gap-3">
      <span className="flex items-center gap-1">
        {icon}
        <Link
          href={`https://solscan.io/address/${addressString}`}
          className="md:border-b border-muted-foreground/60 leading-tight transition-colors group-hover:border-transparent"
          target="_blank"
        >
          {shorten ? shortenAddress(addressString) : addressString}
        </Link>
      </span>
      <div
        className={cn(
          "flex items-center gap-2 transition-opacity duration-300 group-hover:opacity-100",
          hideActions && "md:opacity-0",
          copied && "opacity-100"
        )}
      >
        <CopyToClipboard text={addressString} onCopy={handleCopy}>
          <button className="hidden md:flex items-center text-muted-foreground transition-colors hover:text-foreground">
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </button>
        </CopyToClipboard>
        <Link
          href={`https://solscan.io/address/${addressString}`}
          className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          target="_blank"
        >
          <IconExternalLink size={16} />
        </Link>
      </div>
    </div>
  );
};

export { AddressActions };

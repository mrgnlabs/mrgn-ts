import React from "react";

import Image from "next/image";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { cn } from "@mrgnlabs/mrgn-utils";

type WalletAvatarProps = {
  pfp: string;
  address: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const WalletAvatar = ({ pfp, address, size = "md", className }: WalletAvatarProps) => {
  const sizeInPx = React.useMemo(() => {
    if (size === "sm") return pfp ? 32 : 34;
    if (size === "md") return pfp ? 36 : 42;
    if (size === "lg") return pfp ? 64 : 66;
  }, [size, pfp]);

  const containerSizeInPx = React.useMemo(() => {
    if (!sizeInPx) return 0;
    return sizeInPx + 8;
  }, [sizeInPx]);

  return (
    <div
      className={cn("flex items-center justify-center rounded-full p-0 bg-accent", className)}
      style={{
        width: containerSizeInPx,
        height: containerSizeInPx,
      }}
    >
      <Image src={pfp} alt={shortenAddress(address)} width={sizeInPx} height={sizeInPx} className="rounded-full" />
    </div>
  );
};

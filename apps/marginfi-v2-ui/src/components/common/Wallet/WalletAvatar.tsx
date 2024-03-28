import React from "react";

import Image from "next/image";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { cn } from "~/utils/themeUtils";

type WalletAvatarProps = {
  pfp: string;
  address: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const WalletAvatar = ({ pfp, address, size = "md", className }: WalletAvatarProps) => {
  const sizeInPx = React.useMemo(() => {
    if (size === "sm") return pfp ? 30 : 32;
    if (size === "md") return pfp ? 34 : 40;
    if (size === "lg") return pfp ? 62 : 64;
  }, [size, pfp]);

  const containerSizeInPx = React.useMemo(() => {
    if (!sizeInPx) return 0;
    return sizeInPx + 8;
  }, [sizeInPx]);

  return (
    <div
      className={cn("flex items-center justify-center rounded-full p-0 bg-background-gray-light", className)}
      style={{
        width: containerSizeInPx,
        height: containerSizeInPx,
      }}
    >
      <Image src={pfp} alt={shortenAddress(address)} width={sizeInPx} height={sizeInPx} className="rounded-full" />
    </div>
  );
};

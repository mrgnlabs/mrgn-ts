import React from "react";

import Image from "next/image";

import { nativeToUi, numeralFormatter, shortenAddress, usdFormatter } from "@mrgnlabs/mrgn-common";

import { StakeData } from "~/utils";
import { Badge } from "~/components/ui/badge";

type ActionBoxNativeItemProps = {
  stakeData: StakeData;
  nativeSolPrice: number;
};

const NATIVE_LOGO_URI =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

export const ActionBoxNativeItem = ({ stakeData, nativeSolPrice }: ActionBoxNativeItemProps) => {
  const balance = React.useMemo(() => nativeToUi(stakeData.lamports, 9), [stakeData]);
  const usdBalance = React.useMemo(() => usdFormatter.format(balance * nativeSolPrice), [balance, nativeSolPrice]);

  return (
    <>
      <div className="flex items-center gap-3">
        <Image src={NATIVE_LOGO_URI} alt={"Native stake"} width={28} height={28} className="rounded-full" />
        <div>
          <p>Stake</p>
          <Badge className="text-xs font-normal">{shortenAddress(stakeData.address)}</Badge>
        </div>
      </div>

      <div className="space-y-0.5 text-right font-normal text-sm">
        <p>{balance > 0.01 ? numeralFormatter(balance) : "< 0.01"}</p>
        <p className="text-xs text-muted-foreground">{usdBalance}</p>
      </div>
    </>
  );
};

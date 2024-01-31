import React from "react";

import Image from "next/image";

import { StakeData } from "~/utils";

type SelectedNativeItemProps = {
  stakeData: StakeData;
};

const NATIVE_LOGO_URI =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

export const SelectedNativeItem = ({ stakeData }: SelectedNativeItemProps) => {
  return (
    <>
      <Image src={NATIVE_LOGO_URI} alt={"Native stake"} width={30} height={30} className="rounded-full" />
      <div className="flex flex-col gap-1 mr-auto xs:mr-0">
        <p className="leading-none text-sm">{"Stake"}</p>
      </div>
    </>
  );
};

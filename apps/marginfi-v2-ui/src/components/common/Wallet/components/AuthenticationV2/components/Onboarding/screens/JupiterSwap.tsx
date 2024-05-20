import React from "react";

import Swap from "~/pages/swap";
import { OnrampScreenProps } from "~/utils";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const JupiterSwap = ({ onNext }: props) => {
  return (
    <ScreenWrapper>
      <div className="flex justify-center">
        <Swap />
      </div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};

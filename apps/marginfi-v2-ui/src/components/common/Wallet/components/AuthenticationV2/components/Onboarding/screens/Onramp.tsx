import React from "react";

import { OnrampScreenProps } from "~/utils";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const Onramp = ({ onNext }: props) => {
  return (
    <ScreenWrapper>
      <div className="mx-auto">Mesa onramp coming soon!</div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};

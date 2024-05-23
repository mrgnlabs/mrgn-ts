import React from "react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { OnrampScreenProps } from "~/utils";
import { ActionBox } from "~/components/common/ActionBox";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const DepositToken = ({ onNext }: props) => {
  return (
    <ScreenWrapper>
      <ActionBox requestedAction={ActionType.Deposit} isMini={true} />
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};

import React from "react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { OnrampScreenProps, cn } from "~/utils";
import { ActionBox } from "~/components/common/ActionBox";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const DepositToken = ({ onClose }: props) => {
  return (
    <ScreenWrapper>
      <ActionBox requestedAction={ActionType.Deposit} isDialog={true} />
      <WalletSeperator description="skip for now" onClick={() => onClose()} />
    </ScreenWrapper>
  );
};

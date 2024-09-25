import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { OnrampScreenProps } from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { ActionBox } from "~/components/ActionboxV2";

import { ScreenWrapper, WalletSeperator } from "~/components/wallet-v2/components/sign-up/components";

interface props extends OnrampScreenProps {
  extendedBankInfos: ExtendedBankInfo[];
}

export const DepositToken = ({ extendedBankInfos, successProps, onNext, onClose }: props) => {
  const requestedBank = React.useMemo(() => {
    const mint = successProps?.jupiterSuccess?.quoteResponseMeta?.quoteResponse.outputMint;
    if (mint) {
      const bank = extendedBankInfos.filter((bank) => bank.info.state.mint.equals(mint));
      if (bank.length !== 0) return bank[0];
    }
  }, [successProps?.jupiterSuccess, extendedBankInfos]);

  return (
    <ScreenWrapper noBackground={true}>
      <ActionBox
        requestedAction={ActionType.Deposit}
        requestedBank={requestedBank}
        isMini={true}
        onComplete={() => {
          onClose();
        }}
      />
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};

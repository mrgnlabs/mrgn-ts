import React from "react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { OnrampScreenProps } from "~/utils";
import { ActionBox } from "~/components/common/ActionBox";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { useMrgnlendStore } from "~/store";
import { SOL_MINT } from "~/store/lstStore";

interface props extends OnrampScreenProps {}

export const DepositToken = ({ successProps, onNext }: props) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const requestedBank = React.useMemo(() => {
    const mint = successProps?.jupiterSuccess?.quoteResponseMeta?.quoteResponse.outputMint;
    if (mint) {
      const bank = extendedBankInfos.filter((bank) => bank.info.state.mint.equals(mint));
      if (bank.length !== 0) return bank[0];
    }
  }, [successProps?.jupiterSuccess, extendedBankInfos]);

  return (
    <ScreenWrapper noBackground={true}>
      <ActionBox requestedAction={ActionType.Deposit} requestedBank={requestedBank} isMini={true} />
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};

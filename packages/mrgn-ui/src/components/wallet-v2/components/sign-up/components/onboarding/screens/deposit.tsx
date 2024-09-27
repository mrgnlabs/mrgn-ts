import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { OnrampScreenProps } from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { ActionBox } from "~/components/actionbox-v2";

import { ScreenWrapper, WalletSeperator } from "~/components/wallet-v2/components/sign-up/components";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { IconLoader2 } from "@tabler/icons-react";

interface DepositTokenProps extends OnrampScreenProps {}

export const DepositToken = ({ mrgnState, successProps, onNext, onClose }: DepositTokenProps) => {
  const { walletContextState, connected } = useWallet();

  const extendedBankInfos = React.useMemo(() => {
    return mrgnState?.extendedBankInfos || [];
  }, [mrgnState?.extendedBankInfos]);

  const requestedBank = React.useMemo(() => {
    const mint = successProps?.jupiterSuccess?.quoteResponseMeta?.quoteResponse.outputMint;
    if (mint) {
      const bank = extendedBankInfos.filter((bank) => bank.info.state.mint.equals(mint));
      if (bank.length !== 0) return bank[0];
    }
  }, [successProps?.jupiterSuccess, extendedBankInfos]);

  return (
    <ScreenWrapper noBackground={true}>
      {mrgnState ? (
        <ActionBox.Lend
          lendProps={{
            marginfiClient: mrgnState.marginfiClient,
            nativeSolBalance: mrgnState.nativeSolBalance,
            walletContextState,
            connected,

            selectedAccount: mrgnState.selectedAccount,
            banks: extendedBankInfos,
            requestedLendType: ActionType.Deposit,
            requestedBank: requestedBank,

            // isMini: true,
            onComplete: () => {
              onClose();
            },
          }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <IconLoader2 size={18} className="animate-spin" />
          <span>Loading...</span>
        </div>
      )}
      {/* <ActionBox
        requestedAction={ActionType.Deposit}
        requestedBank={requestedBank}
        isMini={true}
        onComplete={() => {
          onClose();
        }}
      /> */}
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};

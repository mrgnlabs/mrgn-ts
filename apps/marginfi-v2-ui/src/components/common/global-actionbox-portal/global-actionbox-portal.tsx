"use client";

import React from "react";
import * as RadixPortal from "@radix-ui/react-portal";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore, useUiStore } from "~/store";
import { Button } from "~/components/ui/button";

interface BorrowLendPortalProps {
  actionType?: ActionType;
  openTokenSelector?: boolean;
}

export const GlobalActionBoxPortal: React.FC<BorrowLendPortalProps> = ({
  actionType = ActionType.Deposit,
  openTokenSelector = false,
}) => {
  const { connected, walletContextState } = useWallet();
  const [stakeAccounts, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.stakeAccounts,
    state.fetchMrgnlendState,
  ]);
  const [globalActionBoxProps, setGlobalActionBoxProps] = useUiStore((state) => [
    state.globalActionBoxProps,
    state.setGlobalActionBoxProps,
  ]);

  return (
    <RadixPortal.Root>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 
                   opacity-0 animate-fadeIn transition-opacity duration-300 ease-in-out"
      >
        {" "}
        <div className=" p-6 rounded-lg shadow-lg">
          <ActionBox.BorrowLend
            useProvider={true}
            isDialog={true}
            dialogProps={{
              onClose: () => {
                setGlobalActionBoxProps({ ...globalActionBoxProps, isOpen: false });
              },
              isTriggered: true,
            }}
            lendProps={{
              requestedLendType: actionType,
              connected,
              walletContextState,
              stakeAccounts,
              isTokenSelectorOpen: openTokenSelector,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
              onComplete: () => {
                fetchMrgnlendState();
              },
            }}
          />
        </div>
      </div>
    </RadixPortal.Root>
  );
};

export default GlobalActionBoxPortal;

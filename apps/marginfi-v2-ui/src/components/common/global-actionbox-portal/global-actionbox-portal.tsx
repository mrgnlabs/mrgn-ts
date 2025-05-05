"use client";

import React from "react";
import * as RadixPortal from "@radix-ui/react-portal";
import { ActionBox , useWallet} from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore, useUiStore } from "~/store";

export const GlobalActionBoxPortal = () => {
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
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 opacity-0 animate-fadeIn transition-opacity duration-300 ease-in-out">
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
              requestedLendType: globalActionBoxProps.actionType,
              connected,
              walletContextState,
              stakeAccounts,
              searchMode: true,
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

"use client";

import React from "react";
import { PublicKey } from "@solana/web3.js";
import * as RadixPortal from "@radix-ui/react-portal";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo, useExtendedBanks, useRefreshUserData, useUserBalances } from "@mrgnlabs/mrgn-state";

import { useUiStore } from "~/store";
import { BankListWrapper } from "~/components/action-box-v2/components";
import { LendBoxBankList } from "~/components/action-box-v2/actions";

export const GlobalActionBoxPortal = () => {
  const { connected, walletContextState } = useWallet();
  const [selectedBank, setSelectedBank] = React.useState<ExtendedBankInfo | null>(null);

  const refreshUserData = useRefreshUserData();
  const { extendedBanks } = useExtendedBanks();
  const { data: balances } = useUserBalances();
  const [globalActionBoxProps, setGlobalActionBoxProps] = useUiStore((state) => [
    state.globalActionBoxProps,
    state.setGlobalActionBoxProps,
  ]);

  return (
    <RadixPortal.Root>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 opacity-0 animate-fadeIn transition-opacity duration-300 ease-in-out">
        <div className=" p-6 rounded-lg shadow-lg">
          {globalActionBoxProps.isOpen &&
            (selectedBank ? (
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
                  requestedBank: selectedBank,
                  requestedLendType: globalActionBoxProps.actionType,
                  connected,
                  walletContextState,
                  captureEvent: (event, properties) => {
                    capture(event, properties);
                  },
                  onComplete: (newAccountKey?: PublicKey) => {
                    refreshUserData({ newAccountKey });
                  },
                }}
              />
            ) : (
              <BankListWrapper
                isOpen={true}
                setIsOpen={(open) => {
                  if (!open) {
                    setGlobalActionBoxProps({ ...globalActionBoxProps, isOpen: false });
                  }
                }}
                Trigger={<></>}
                Content={
                  <LendBoxBankList.BankList
                    isOpen={true}
                    onClose={(hasSetBank) => {
                      !hasSetBank && setGlobalActionBoxProps({ ...globalActionBoxProps, isOpen: false });
                    }}
                    selectedBank={selectedBank}
                    onSetSelectedBank={setSelectedBank}
                    actionType={globalActionBoxProps.actionType}
                    banks={extendedBanks}
                    nativeSolBalance={balances?.nativeSolBalance ?? 0}
                    connected={connected}
                  />
                }
              />
            ))}
        </div>
      </div>
    </RadixPortal.Root>
  );
};

export default GlobalActionBoxPortal;

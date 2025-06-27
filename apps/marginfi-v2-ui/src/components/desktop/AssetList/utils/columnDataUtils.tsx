import React from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { ExtendedBankInfo, getCurrentAction, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountType } from "@mrgnlabs/marginfi-client-v2";
import { ActionBox, useWallet, WalletContextStateOverride } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { useNativeStakeData } from "@mrgnlabs/mrgn-state";

const ActionBoxCell = ({
  bank,
  isInLendingMode,
  connected,
  walletContextState,
  fetchMrgnlendState,
}: {
  bank: ExtendedBankInfo;
  isInLendingMode: boolean;
  connected: boolean;
  walletContextState: WalletContextStateOverride | WalletContextState;
  fetchMrgnlendState: () => void;
}) => {
  const { stakePoolMetadataMap } = useNativeStakeData();
  const currentAction = getCurrentAction(isInLendingMode, bank);
  const isDust = bank.isActive && bank.position.isDust;
  const showCloseBalance = currentAction === ActionType.Withdraw && isDust;
  const stakePoolMetadata = stakePoolMetadataMap.get(bank.address.toBase58());

  if (currentAction === ActionType.Repay) {
    return (
      <ActionBox.Repay
        isDialog={true}
        useProvider={true}
        repayProps={{
          connected: connected,
          requestedBank: bank,
          requestedSecondaryBank: undefined,
          onComplete: () => {
            fetchMrgnlendState();
          },
          captureEvent: (event, properties) => {
            capture(event, properties);
          },
        }}
        dialogProps={{
          title: `${currentAction} ${bank.meta.tokenSymbol}`,
          trigger: (
            <Button variant="secondary" className="w-full md:w-[120px] hover:bg-primary hover:text-primary-foreground">
              {showCloseBalance ? "Close" : currentAction}
            </Button>
          ),
        }}
      />
    );
  } else {
    return (
      <ActionBox.Lend
        isDialog={true}
        useProvider={true}
        lendProps={{
          requestedBank: bank,
          requestedLendType: currentAction,
          connected: connected,
          walletContextState,
          onComplete: () => {
            fetchMrgnlendState();
          },
        }}
        dialogProps={{
          title: `${currentAction} ${bank.meta.tokenSymbol}`,
          trigger: (
            <Button
              variant="secondary"
              className="w-full md:w-[120px] hover:bg-primary hover:text-primary-foreground"
              disabled={bank.info.rawBank.config.assetTag === 2 && !stakePoolMetadata?.isActive}
            >
              {showCloseBalance ? "Close" : currentAction}
            </Button>
          ),
        }}
      />
    );
  }
};

export const getAction = (
  bank: ExtendedBankInfo,
  isInLendingMode: boolean,
  connected: boolean,
  walletContextState: WalletContextStateOverride | WalletContextState,
  fetchMrgnlendState: () => void,
  marginfiAccount?: MarginfiAccountType | null
) => {
  const currentAction = getCurrentAction(isInLendingMode, bank);
  const isDust = bank.isActive && bank.position.isDust;
  const showCloseBalance = currentAction === ActionType.Withdraw && isDust;

  return (
    <>
      {!marginfiAccount && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                id={bank.address.toBase58()}
                className="flex px-0 sm:pl-4 gap-4 justify-center lg:justify-end items-center"
              >
                <ActionBoxCell
                  bank={bank}
                  isInLendingMode={isInLendingMode}
                  connected={connected}
                  walletContextState={walletContextState}
                  fetchMrgnlendState={fetchMrgnlendState}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>User account will be automatically created on first deposit</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {marginfiAccount && (
        <div className="flex px-0 sm:pl-4 gap-4 justify-center lg:justify-end items-center">
          <ActionBoxCell
            bank={bank}
            isInLendingMode={isInLendingMode}
            connected={connected}
            walletContextState={walletContextState}
            fetchMrgnlendState={fetchMrgnlendState}
          />
        </div>
      )}
    </>
  );
};

import React from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { ExtendedBankInfo, getCurrentAction, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionBox, WalletContextStateOverride } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";

import { useMrgnlendStore } from "~/store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";

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
  const [stakeAccounts] = useMrgnlendStore((state) => [state.stakeAccounts]);
  const currentAction = getCurrentAction(isInLendingMode, bank);
  const isDust = bank.isActive && bank.position.isDust;
  const showCloseBalance = currentAction === ActionType.Withdraw && isDust;

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
          stakeAccounts,
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
              disabled={bank.info.rawBank.config.assetTag === 2 && !bank.meta.stakePool?.isActive}
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
  marginfiAccount: MarginfiAccountWrapper | null,
  connected: boolean,
  walletContextState: WalletContextStateOverride | WalletContextState,
  fetchMrgnlendState: () => void
) => {
  const currentAction = getCurrentAction(isInLendingMode, bank);
  const isDust = bank.isActive && bank.position.isDust;
  const showCloseBalance = currentAction === ActionType.Withdraw && isDust;

  return (
    <>
      {marginfiAccount === null && (
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

      {marginfiAccount !== null && (
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

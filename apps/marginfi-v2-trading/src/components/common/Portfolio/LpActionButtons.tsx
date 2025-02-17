import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { cn, capture } from "@mrgnlabs/mrgn-utils";

import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2";
import { useTradeStoreV2, useUiStore } from "~/store";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { Button } from "~/components/ui/button";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useArenaClient } from "~/hooks/useArenaClient";

type LpActionButtonsProps = {
  activePool: ArenaPoolV2Extended;
  size?: "sm" | "lg";
};

export const LpActionButtons = ({ size = "sm", activePool }: LpActionButtonsProps) => {
  const { connection } = useConnection();
  const { connected, wallet } = useWallet();
  const { setDisplaySettings } = useUiStore((state) => ({
    setDisplaySettings: state.setDisplaySettings,
  }));
  const [refreshGroup, nativeSolBalance] = useTradeStoreV2((state) => [state.refreshGroup, state.nativeSolBalance]);
  const client = useArenaClient({ groupPk: activePool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: activePool.groupPk,
    banks: [activePool.tokenBank, activePool.quoteBank],
  });

  const lendingBank = React.useMemo(() => {
    if (activePool?.tokenBank.isActive && activePool.tokenBank.position.isLending) {
      return activePool.tokenBank;
    }
    if (activePool.quoteBank.isActive && activePool.quoteBank.position.isLending) {
      return activePool.quoteBank;
    }

    return null;
  }, [activePool?.tokenBank, activePool?.quoteBank]);

  return (
    <ActionBoxProvider
      banks={[activePool.tokenBank, activePool.quoteBank]}
      nativeSolBalance={nativeSolBalance}
      marginfiClient={client}
      selectedAccount={wrappedAccount}
      connected={connected}
      accountSummaryArg={accountSummary ?? undefined}
      showActionComplete={false}
      hidePoolStats={["type"]}
      setDisplaySettings={setDisplaySettings}
    >
      <div className={cn("flex gap-3 w-full justify-between", size === "sm" && "justify-end")}>
        <ActionBox.Lend
          isDialog={true}
          useProvider={true}
          lendProps={{
            connected: connected,
            requestedLendType: ActionType.Deposit,
            showTokenSelection: true,
            requestedBank: activePool.tokenBank,
            showAvailableCollateral: false,
            showTokenSelectionGroups: false,
            captureEvent: () => {
              capture("position_add_btn_click", {
                group: activePool.groupPk.toBase58(),
                token: activePool.tokenBank.meta.tokenSymbol,
              });
            },
            onComplete: () => {
              refreshGroup({
                groupPk: activePool.groupPk,
                banks: [activePool.tokenBank.address, activePool.quoteBank.address],
                connection,
                wallet,
              });
            },
          }}
          dialogProps={{
            trigger: (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 min-w-16"
                onClick={() => {
                  capture("position_add_btn_click", {
                    group: activePool.groupPk.toBase58(),
                    token: activePool.tokenBank.meta.tokenSymbol,
                  });
                }}
              >
                <IconPlus size={14} />
                Add
              </Button>
            ),
            title: `Supply ${activePool.tokenBank.meta.tokenSymbol}`,
          }}
        />

        {lendingBank && (
          <ActionBox.Lend
            isDialog={true}
            useProvider={true}
            lendProps={{
              connected: connected,
              requestedLendType: ActionType.Withdraw,
              showTokenSelection: true,
              requestedBank: lendingBank,
              showTokenSelectionGroups: false,
              captureEvent: () => {
                capture("position_withdraw_btn_click", {
                  group: activePool.groupPk.toBase58(),
                  token: lendingBank.meta.tokenSymbol,
                });
              },
              onComplete: () => {
                refreshGroup({
                  groupPk: activePool.groupPk,
                  banks: [activePool.tokenBank.address, activePool.quoteBank.address],
                  connection,
                  wallet,
                });
              },
            }}
            dialogProps={{
              trigger: (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 min-w-16"
                  onClick={() => {
                    capture("position_withdraw_btn_click", {
                      group: activePool.groupPk.toBase58(),
                      token: lendingBank.meta.tokenSymbol,
                    });
                  }}
                >
                  <IconMinus size={14} />
                  Withdraw
                </Button>
              ),
              title: `Withdraw ${lendingBank.meta.tokenSymbol}`,
            }}
          />
        )}
      </div>
    </ActionBoxProvider>
  );
};

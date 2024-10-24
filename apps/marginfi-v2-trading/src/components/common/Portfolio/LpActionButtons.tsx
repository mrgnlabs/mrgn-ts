import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { cn, capture } from "@mrgnlabs/mrgn-utils";

import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2";
import { useTradeStore } from "~/store";
import { GroupData } from "~/store/tradeStore";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { Button } from "~/components/ui/button";

type LpActionButtonsProps = {
  marginfiAccount?: MarginfiAccountWrapper;
  activeGroup: GroupData;
  size?: "sm" | "lg";
};

export const LpActionButtons = ({ size = "sm", marginfiAccount, activeGroup }: LpActionButtonsProps) => {
  const { connection } = useConnection();
  const { connected, wallet } = useWallet();
  const [fetchTradeState, nativeSolBalance] = useTradeStore((state) => [state.fetchTradeState, state.nativeSolBalance]);

  const lendingBank = React.useMemo(() => {
    if (activeGroup?.pool?.token.isActive && activeGroup?.pool?.token.position.isLending)
      return [activeGroup?.pool?.token];
    const lendingBanks = activeGroup?.pool?.quoteTokens.filter((group) => group.isActive && group.position.isLending);
    if (lendingBanks.length > 0) {
      return lendingBanks;
    }

    return null;
  }, [activeGroup?.pool?.quoteTokens, activeGroup?.pool?.token]);

  return (
    <ActionBoxProvider
      banks={[activeGroup.pool.token, activeGroup.pool.quoteTokens[0]]}
      nativeSolBalance={nativeSolBalance}
      marginfiClient={activeGroup.client}
      selectedAccount={activeGroup.selectedAccount}
      connected={connected}
      accountSummaryArg={activeGroup.accountSummary}
      showActionComplete={false}
    >
      <div className={cn("flex gap-3 w-full", size === "sm" && "justify-end")}>
        <ActionBox.Lend
          isDialog={true}
          useProvider={true}
          lendProps={{
            connected: connected,
            requestedLendType: ActionType.Deposit,
            showTokenSelection: true,
            requestedBank: activeGroup.pool.token,
            showAvailableCollateral: false,
            showTokenSelectionGroups: false,
            captureEvent: () => {
              capture("position_add_btn_click", {
                group: activeGroup?.groupPk?.toBase58(),
                token: activeGroup.pool.token.meta.tokenSymbol,
              });
            },
            onComplete: () => {
              fetchTradeState({
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
                    group: activeGroup?.groupPk?.toBase58(),
                    token: activeGroup.pool.token.meta.tokenSymbol,
                  });
                }}
              >
                <IconPlus size={14} />
                Add
              </Button>
            ),
            title: `Supply ${activeGroup.pool.token.meta.tokenSymbol}`,
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
              requestedBank: lendingBank[0],
              showTokenSelectionGroups: false,
              captureEvent: () => {
                capture("position_withdraw_btn_click", {
                  group: activeGroup?.groupPk?.toBase58(),
                  token: lendingBank[0].meta.tokenSymbol,
                });
              },
              onComplete: () => {
                fetchTradeState({
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
                      group: activeGroup?.groupPk?.toBase58(),
                      token: lendingBank[0].meta.tokenSymbol,
                    });
                  }}
                >
                  <IconMinus size={14} />
                  Withdraw
                </Button>
              ),
              title: `Withdraw ${lendingBank[0].meta.tokenSymbol}`,
            }}
          />
        )}
      </div>
    </ActionBoxProvider>
  );
};
